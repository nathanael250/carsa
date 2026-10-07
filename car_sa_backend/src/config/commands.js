/**
 * Commands Configuration
 * Maps command strings to models and methods
 */
class Commands {
    model() {
        this.cmd = [
            // User
            'REGISTER_USER',
            'VERIFY_EMAIL',
            'RESEND_VERIFICATION_CODE',
            'LOGIN',
            'LIST_USERS',
            'LIST_USERS_WITH_DETAILS',
            'SEARCH_USER',
            'DELETE_USER_WITH_DETAILS',
            'CREATE_GARAGE_ADMIN',
            'LIST_PENDING_GARAGE_ADMINS',
            'APPROVE_GARAGE_ADMIN',
            'REJECT_GARAGE_ADMIN',
            'CREATE_SERVICE_TECHNICIAN',
            'LIST_SERVICE_TECHNICIANS',
            'UPDATE_SERVICE_TECHNICIAN',
            'SET_SERVICE_TECHNICIAN_STATUS',
            'RESET_SERVICE_TECHNICIAN_PASSWORD',
            'GET_CURRENT_USER',
            'UPDATE_PROFILE',
            'CHANGE_PASSWORD',
            'REGISTER_PUSH_DEVICE_TOKEN',
            'UNREGISTER_PUSH_DEVICE_TOKEN',

            // Garage
            'CREATE_GARAGE',
            'LIST_GARAGES',
            'GARAGE_REGISTER_VEHICLE',
            'FIND_VEHICLE_BY_LICENSE',
            'GARAGE_DASHBOARD_STATS',

            // Service catalog
            'CREATE_SERVICE_CATALOG',
            'LIST_SERVICE_CATALOGS',
            'GET_SERVICE_CATALOG',
            'UPDATE_SERVICE_CATALOG',
            'DELETE_SERVICE_CATALOG',
            'LIST_OIL_PRODUCTS',
            'GET_OIL_PRODUCT',
            'CREATE_OIL_PRODUCT',
            'UPDATE_OIL_PRODUCT',
            'DELETE_OIL_PRODUCT',

            // Services
            'CREATE_SERVICE',
            'LIST_SERVICES',
            'GET_SERVICE',
            'GET_SERVICES_BY_OWNER',
            'GET_SERVICES_BY_VEHICLE',
            'UPDATE_SERVICE',

            // Car register requests
            'CREATE_CAR_REGISTER_REQUEST',
            'GET_CAR_REGISTER_REQUEST',
            'VERIFY_CAR_REGISTER_CODE',
            'REGISTER_VEHICLE_FROM_REQUEST',
            'CONFIRM_CAR_REGISTER_REQUEST',
            'REJECT_CAR_REGISTER_REQUEST',

            // Notifications
            'LIST_NOTIFICATIONS',
            'GET_NOTIFICATION',
            'MARK_NOTIFICATION_READ',
            'MARK_ALL_NOTIFICATIONS_READ',
            'DELETE_NOTIFICATION',
            'GET_UNREAD_NOTIFICATION_COUNT',

            // Vehicles
            'LIST_VEHICLES_BY_OWNER',
            'GET_VEHICLE',
            'LIST_VEHICLES',

            // Next service due
            'GET_NEXT_SERVICE_DUE_BY_VEHICLE',
            'GET_NEXT_SERVICE_DUE_ALL',
            'GET_NEXT_SERVICE_DUE_BY_ID',

            // Upload
            'UPLOAD_SINGLE',
            'UPLOAD_MULTIPLE',
        ];
        return this.cmd;
    }

    config() {
        const cmd = {};

        // User
        cmd['REGISTER_USER'] = {model: 'User', method: 'register', return: 'promise'};
        cmd['VERIFY_EMAIL'] = {model: 'User', method: 'verifyEmail', return: 'promise'};
        cmd['RESEND_VERIFICATION_CODE'] = {model: 'User', method: 'resendVerificationCode', return: 'promise'};
        cmd['LOGIN'] = {model: 'User', method: 'login', return: 'promise'};
        cmd['LIST_USERS'] = {model: 'User', method: 'selectUsers', return: 'promise'};
        cmd['LIST_USERS_WITH_DETAILS'] = {model: 'User', method: 'getRegisterdUserWithAllDetails', return: 'promise'};
        cmd['SEARCH_USER'] = {model: 'User', method: 'searchUser', return: 'promise'};
        cmd['DELETE_USER_WITH_DETAILS'] = {model: 'User', method: 'deleteUserWhithAllDetails', return: 'promise'};
        cmd['CREATE_GARAGE_ADMIN'] = {model: 'User', method: 'createGarageAdmin', return: 'promise'};
        cmd['LIST_PENDING_GARAGE_ADMINS'] = {model: 'User', method: 'listPendingGarageAdmins', return: 'promise'};
        cmd['APPROVE_GARAGE_ADMIN'] = {model: 'User', method: 'approveGarageAdmin', return: 'promise'};
        cmd['REJECT_GARAGE_ADMIN'] = {model: 'User', method: 'rejectGarageAdmin', return: 'promise'};
        cmd['CREATE_SERVICE_TECHNICIAN'] = {model: 'User', method: 'createMechanic', return: 'promise'};
        cmd['LIST_SERVICE_TECHNICIANS'] = {model: 'User', method: 'listMechanics', return: 'promise'};
        cmd['UPDATE_SERVICE_TECHNICIAN'] = {model: 'User', method: 'updateMechanic', return: 'promise'};
        cmd['SET_SERVICE_TECHNICIAN_STATUS'] = {model: 'User', method: 'setMechanicStatus', return: 'promise'};
        cmd['RESET_SERVICE_TECHNICIAN_PASSWORD'] = {model: 'User', method: 'resetMechanicPassword', return: 'promise'};
        cmd['GET_CURRENT_USER'] = {model: 'User', method: 'getCurrentUser', return: 'promise'};
        cmd['UPDATE_PROFILE'] = {model: 'User', method: 'updateProfile', return: 'promise'};
        cmd['CHANGE_PASSWORD'] = {model: 'User', method: 'changePassword', return: 'promise'};
        cmd['REGISTER_PUSH_DEVICE_TOKEN'] = {model: 'PushDeviceToken', method: 'registerToken', return: 'promise'};
        cmd['UNREGISTER_PUSH_DEVICE_TOKEN'] = {model: 'PushDeviceToken', method: 'unregisterToken', return: 'promise'};

        // Garage
        cmd['CREATE_GARAGE'] = {model: 'Garage', method: 'createGarage', return: 'promise'};
        cmd['LIST_GARAGES'] = {model: 'Garage', method: 'listGarages', return: 'promise'};
        cmd['GARAGE_REGISTER_VEHICLE'] = {model: 'Garage', method: 'registerVehicle', return: 'promise'};
        cmd['FIND_VEHICLE_BY_LICENSE'] = {model: 'Garage', method: 'findVehicleByLicensePlate', return: 'promise'};
        cmd['GARAGE_DASHBOARD_STATS'] = {model: 'GarageDashboard', method: 'getDashboardStats', return: 'promise'};

        // Service catalog
        cmd['CREATE_SERVICE_CATALOG'] = {model: 'ServiceCatalog', method: 'createServiceCatalog', return: 'promise'};
        cmd['LIST_SERVICE_CATALOGS'] = {model: 'ServiceCatalog', method: 'getAllServiceCatalogs', return: 'promise'};
        cmd['GET_SERVICE_CATALOG'] = {model: 'ServiceCatalog', method: 'getServiceCatalogById', return: 'promise'};
        cmd['UPDATE_SERVICE_CATALOG'] = {model: 'ServiceCatalog', method: 'updateServiceCatalog', return: 'promise'};
        cmd['DELETE_SERVICE_CATALOG'] = {model: 'ServiceCatalog', method: 'deleteServiceCatalog', return: 'promise'};
        cmd['LIST_OIL_PRODUCTS'] = {model: 'OilProduct', method: 'listOilProducts', return: 'promise'};
        cmd['GET_OIL_PRODUCT'] = {model: 'OilProduct', method: 'getOilProductById', return: 'promise'};
        cmd['CREATE_OIL_PRODUCT'] = {model: 'OilProduct', method: 'createOilProduct', return: 'promise'};
        cmd['UPDATE_OIL_PRODUCT'] = {model: 'OilProduct', method: 'updateOilProduct', return: 'promise'};
        cmd['DELETE_OIL_PRODUCT'] = {model: 'OilProduct', method: 'deleteOilProduct', return: 'promise'};

        // Services
        cmd['CREATE_SERVICE'] = {model: 'Service', method: 'createService', return: 'promise'};
        cmd['LIST_SERVICES'] = {model: 'Service', method: 'getAllServices', return: 'promise'};
        cmd['GET_SERVICE'] = {model: 'Service', method: 'getServiceById', return: 'promise'};
        cmd['GET_SERVICES_BY_OWNER'] = {model: 'Service', method: 'getServicesByOwner', return: 'promise'};
        cmd['GET_SERVICES_BY_VEHICLE'] = {model: 'Service', method: 'getServicesByVehicle', return: 'promise'};
        cmd['UPDATE_SERVICE'] = {model: 'Service', method: 'updateService', return: 'promise'};

        // Car register requests
        cmd['CREATE_CAR_REGISTER_REQUEST'] = {model: 'CarRegisterRequest', method: 'createRequest', return: 'promise'};
        cmd['GET_CAR_REGISTER_REQUEST'] = {model: 'CarRegisterRequest', method: 'getById', return: 'promise'};
        cmd['VERIFY_CAR_REGISTER_CODE'] = {model: 'CarRegisterRequest', method: 'verifyCode', return: 'promise'};
        cmd['REGISTER_VEHICLE_FROM_REQUEST'] = {model: 'CarRegisterRequest', method: 'registerVehicle', return: 'promise'};
        cmd['CONFIRM_CAR_REGISTER_REQUEST'] = {model: 'CarRegisterRequest', method: 'confirm', return: 'promise'};
        cmd['REJECT_CAR_REGISTER_REQUEST'] = {model: 'CarRegisterRequest', method: 'reject', return: 'promise'};

        // Notifications
        cmd['LIST_NOTIFICATIONS'] = {model: 'Notification', method: 'getAllNotifications', return: 'promise'};
        cmd['GET_NOTIFICATION'] = {model: 'Notification', method: 'getNotificationById', return: 'promise'};
        cmd['MARK_NOTIFICATION_READ'] = {model: 'Notification', method: 'markAsReadById', return: 'promise'};
        cmd['MARK_ALL_NOTIFICATIONS_READ'] = {model: 'Notification', method: 'markAllAsReadForUser', return: 'promise'};
        cmd['DELETE_NOTIFICATION'] = {model: 'Notification', method: 'deleteNotificationById', return: 'promise'};
        cmd['GET_UNREAD_NOTIFICATION_COUNT'] = {model: 'Notification', method: 'getUnreadCount', return: 'promise'};

        // Vehicles
        cmd['LIST_VEHICLES_BY_OWNER'] = {model: 'Vehicle', method: 'getVehiclesByOwner', return: 'promise'};
        cmd['GET_VEHICLE'] = {model: 'Vehicle', method: 'getVehicleById', return: 'promise'};
        cmd['LIST_VEHICLES'] = {model: 'Vehicle', method: 'getAllVehicles', return: 'promise'};

        // Next service due
        cmd['GET_NEXT_SERVICE_DUE_BY_VEHICLE'] = {model: 'NextServiceDue', method: 'getByVehicle', return: 'promise'};
        cmd['GET_NEXT_SERVICE_DUE_ALL'] = {model: 'NextServiceDue', method: 'getAll', return: 'promise'};
        cmd['GET_NEXT_SERVICE_DUE_BY_ID'] = {model: 'NextServiceDue', method: 'getById', return: 'promise'};

        // Upload
        cmd['UPLOAD_SINGLE'] = {model: 'Upload', method: 'uploadFile', return: 'promise', passReqRes: true};
        cmd['UPLOAD_MULTIPLE'] = {model: 'Upload', method: 'uploadMultiple', return: 'promise', passReqRes: true};

        return cmd;
    }
}

module.exports = Commands;
