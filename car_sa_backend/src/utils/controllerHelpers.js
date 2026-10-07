const buildContext = (req) => ({
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user,
    file: req.file,
    files: req.files,
    headers: req.headers,
    protocol: req.protocol,
    host: req.get('host'),
});

const sendResponse = (res, result) => {
    if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'status')) {
        return res.status(result.status).json(result.data);
    }
    return res.json(result);
};

const handleError = (res, err) => {
    const statusCode = err.statusCode || err.status || 500;
    const payload = {
        error: err.original?.message || err.message || 'Unexpected error',
    };
    if (err.details && typeof err.details === 'object') {
        Object.assign(payload, err.details);
    }
    return res.status(statusCode).json(payload);
};

module.exports = {
    buildContext,
    sendResponse,
    handleError,
};
