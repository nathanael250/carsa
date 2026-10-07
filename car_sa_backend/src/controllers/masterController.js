const express = require('express');
const router = express.Router();
const Commands = require('../config/commands');
const {canAccessCommand, requiresAuthentication} = require('../config/permissions');
const {buildContext, sendResponse, handleError} = require('../utils/controllerHelpers');

const COMMAND_TIMEOUT_MS = Number(process.env.COMMAND_TIMEOUT_MS || 20000);

const withTimeout = async (promise, ms, command) => Promise.race([
    promise,
    new Promise((_, reject) => {
        setTimeout(() => {
            const error = new Error(`Command '${command}' timed out after ${ms}ms`);
            error.status = 504;
            reject(error);
        }, ms);
    }),
]);

/**
 * Master Controller
 * Single endpoint that handles all requests based on command in headers
 * POST / with headers: apiKey (optional), req
 */
router.post('', async (req, res) => {
    try {
        const apiKey = req.headers.apikey || req.headers['api-key'];
        if (process.env.API_KEY) {
            if (!apiKey || process.env.API_KEY !== apiKey) {
                return res.status(401).json({
                    error: 'Unauthorized access to the API',
                });
            }
        }

        const reqCommandRaw = req.headers.req || req.headers.command;
        if (!reqCommandRaw) {
            return res.status(400).json({
                error: 'req header is required',
            });
        }

        const reqCommand = String(reqCommandRaw).trim().toUpperCase();

        const commands = new Commands();
        const commandList = commands.model();
        const config = commands.config();

        if (!commandList.includes(reqCommand)) {
            return res.status(400).json({
                error: `Unknown command: ${reqCommand}`,
            });
        }

        const commandConfig = config[reqCommand];
        if (!commandConfig) {
            return res.status(500).json({
                error: `Command configuration not found for ${reqCommand}`,
            });
        }

        const userRole = req.user?.role || null;

        if (requiresAuthentication(reqCommand) && !req.user) {
            return res.status(401).json({
                error: req.authError || `Command '${reqCommand}' requires authentication`,
            });
        }

        if (!canAccessCommand(userRole, reqCommand)) {
            return res.status(403).json({
                error: `Role '${userRole || 'anonymous'}' does not have permission to execute '${reqCommand}'`,
            });
        }

        let Model;
        try {
            Model = require(`../models/${commandConfig.model}`);
        } catch (error) {
            return res.status(500).json({
                error: `${commandConfig.model} model not found`,
            });
        }

        const method = commandConfig.method;
        if (typeof Model[method] !== 'function') {
            return res.status(500).json({
                error: `${method} method not found on ${commandConfig.model}`,
            });
        }

        // Build command params. Allow payloads like { body, params, query }.
        const context = buildContext(req);
        if (req.body && typeof req.body === 'object') {
            const hasWrappedPayload = Object.prototype.hasOwnProperty.call(req.body, 'body')
                || Object.prototype.hasOwnProperty.call(req.body, 'params')
                || Object.prototype.hasOwnProperty.call(req.body, 'query');
            if (hasWrappedPayload) {
                context.body = req.body.body || {};
                context.params = req.body.params || {};
                context.query = req.body.query || {};
            }
        }

        let result;
        if (commandConfig.passReqRes) {
            result = await withTimeout(Model[method](req, res), COMMAND_TIMEOUT_MS, reqCommand);
        } else {
            result = await withTimeout(Model[method](context), COMMAND_TIMEOUT_MS, reqCommand);
        }

        return sendResponse(res, result);
    } catch (error) {
        console.error('Unexpected error in master controller', error);
        return handleError(res, error);
    }
});

module.exports = router;
