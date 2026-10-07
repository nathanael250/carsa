/**
 * Role-Based Permission Matrix
 * Empty array [] means public (no authentication required)
 */

const COMMAND_PERMISSIONS = {
    // Public
    REGISTER_USER: [],
    LOGIN: [],
    VERIFY_EMAIL: [],
    RESEND_VERIFICATION_CODE: [],
    UPLOAD_SINGLE: [],
    UPLOAD_MULTIPLE: [],

    // Super Admin only
    LIST_USERS: ['super_admin'],
    LIST_USERS_WITH_DETAILS: ['super_admin'],
    DELETE_USER_WITH_DETAILS: ['super_admin'],
    CREATE_SERVICE_CATALOG: ['super_admin'],
    UPDATE_SERVICE_CATALOG: ['super_admin'],
    DELETE_SERVICE_CATALOG: ['super_admin'],
    CREATE_OIL_PRODUCT: ['super_admin'],
    UPDATE_OIL_PRODUCT: ['super_admin'],
    DELETE_OIL_PRODUCT: ['super_admin'],
    CREATE_GARAGE: ['super_admin', 'garage_admin'],
    LIST_GARAGES: ['super_admin', 'garage_admin'],
    CREATE_GARAGE_ADMIN: ['super_admin'],
    LIST_PENDING_GARAGE_ADMINS: ['super_admin'],
    APPROVE_GARAGE_ADMIN: ['super_admin'],
    REJECT_GARAGE_ADMIN: ['super_admin'],

    // Garage Admin + Mechanic operations
    SEARCH_USER: ['garage_admin', 'service_technician', 'super_admin'],
    GARAGE_REGISTER_VEHICLE: ['garage_admin', 'service_technician', 'super_admin'],
    FIND_VEHICLE_BY_LICENSE: ['garage_admin', 'service_technician', 'super_admin'],
    LIST_SERVICE_CATALOGS: ['garage_admin', 'service_technician', 'super_admin'],
    GET_SERVICE_CATALOG: ['garage_admin', 'service_technician', 'super_admin'],
    LIST_OIL_PRODUCTS: ['garage_admin', 'service_technician', 'super_admin'],
    GET_OIL_PRODUCT: ['garage_admin', 'service_technician', 'super_admin'],
    CREATE_SERVICE: ['garage_admin', 'service_technician', 'super_admin'],
    UPDATE_SERVICE: ['garage_admin', 'service_technician', 'super_admin'],
    INIT_SERVICE_PAYMENT: ['garage_admin', 'service_technician', 'super_admin'],
    CHECK_SERVICE_PAYMENT_STATUS: ['garage_admin', 'service_technician', 'super_admin'],
    CREATE_CAR_REGISTER_REQUEST: ['garage_admin', 'service_technician', 'super_admin'],
    VERIFY_CAR_REGISTER_CODE: ['garage_admin', 'service_technician', 'super_admin'],
    REGISTER_VEHICLE_FROM_REQUEST: ['garage_admin', 'service_technician', 'super_admin'],
    LIST_VEHICLES: ['super_admin', 'garage_admin'],
    CREATE_SERVICE_TECHNICIAN: ['garage_admin', 'super_admin'],
    LIST_SERVICE_TECHNICIANS: ['garage_admin', 'super_admin'],
    UPDATE_SERVICE_TECHNICIAN: ['garage_admin', 'super_admin'],
    SET_SERVICE_TECHNICIAN_STATUS: ['garage_admin', 'super_admin'],
    RESET_SERVICE_TECHNICIAN_PASSWORD: ['garage_admin', 'super_admin'],
    GET_CURRENT_USER: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    UPDATE_PROFILE: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    CHANGE_PASSWORD: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    REGISTER_PUSH_DEVICE_TOKEN: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    UNREGISTER_PUSH_DEVICE_TOKEN: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],

    // Garage Admin only
    GARAGE_DASHBOARD_STATS: ['garage_admin'],

    // Any authenticated user
    LIST_SERVICES: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_SERVICE: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_SERVICES_BY_OWNER: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_SERVICES_BY_VEHICLE: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_CAR_REGISTER_REQUEST: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    CONFIRM_CAR_REGISTER_REQUEST: ['car_owner'],
    REJECT_CAR_REGISTER_REQUEST: ['car_owner'],
    LIST_NOTIFICATIONS: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_NOTIFICATION: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    MARK_NOTIFICATION_READ: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    MARK_ALL_NOTIFICATIONS_READ: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    DELETE_NOTIFICATION: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_UNREAD_NOTIFICATION_COUNT: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    LIST_VEHICLES_BY_OWNER: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_VEHICLE: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_NEXT_SERVICE_DUE_BY_VEHICLE: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_NEXT_SERVICE_DUE_ALL: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
    GET_NEXT_SERVICE_DUE_BY_ID: ['super_admin', 'garage_admin', 'service_technician', 'car_owner'],
};

function canAccessCommand(userRole, command) {
    if (!Object.prototype.hasOwnProperty.call(COMMAND_PERMISSIONS, command)) {
        return false;
    }

    const allowedRoles = COMMAND_PERMISSIONS[command];

    if (allowedRoles.length === 0) {
        return true;
    }

    if (!userRole) {
        return false;
    }

    return allowedRoles.includes(userRole);
}

function requiresAuthentication(command) {
    if (!Object.prototype.hasOwnProperty.call(COMMAND_PERMISSIONS, command)) {
        return true;
    }
    return COMMAND_PERMISSIONS[command].length > 0;
}

module.exports = {
    COMMAND_PERMISSIONS,
    canAccessCommand,
    requiresAuthentication,
};
