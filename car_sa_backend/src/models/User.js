const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const {Op} = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Garage = require('./Garage');
const BusinessDocument = require('./BusinessDocument');
const EmailVerification = require('./EmailVerification');
const {generateVerificationCode, hashCode, verifyCode} = require('../utils/tokenUtils');
const {sendVerificationEmail, isEmailEnabled} = require('../utils/emailService');
const {createHttpError} = require('../utils/httpError');

const User = sequelize.define('User', {
    name: {type: DataTypes.STRING, allowNull: false},
    email: {type: DataTypes.STRING, allowNull: false,},
    email_verified:  {type: DataTypes.BOOLEAN, allowNull: false, defaultValue:false},
    phone: {type: DataTypes.STRING, allowNull: true},

    date_of_birth: {type: DataTypes.DATE, allowNull: true},
    gender: {type: DataTypes.STRING(10), allowNull: true},
    role: {type: DataTypes.ENUM('super_admin', 'garage_admin', 'service_technician', 'car_owner'), allowNull: false, defaultValue: 'car_owner'},
    password_hash: {type: DataTypes.TEXT, allowNull: false},
    garage_id: {type: DataTypes.INTEGER, allowNull: true},
    active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
    approved: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
    approved_at: {type: DataTypes.DATE, allowNull: true},
    approved_by_user_id: {type: DataTypes.INTEGER, allowNull: true},
}, {
    tableName: 'users',
    underscored: true,
    indexes: [
        {name: 'email', unique: true, fields: ['email']},
    ],
});

User.hasOne(Garage, {foreignKey: 'owner_user_id', as: 'garage'});
Garage.belongsTo(User, {foreignKey: 'owner_user_id', as: 'owner'});
User.belongsTo(Garage, {foreignKey: 'garage_id', as: 'garage_assignment'});
Garage.hasMany(User, {foreignKey: 'garage_id', as: 'staff'});

User.register = async ({body}) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            name,
            email,
            phone,
            date_of_birth,
            password,
            gender,
            role = 'car_owner',
            garage,
            documents,
        } = body || {};

        if (role !== 'car_owner' && role !== 'garage_admin') {
            throw createHttpError('Only car owners and garage admins can self-register.', 403);
        }

        if (!name || !email || !password) {
            throw createHttpError('Name, email, and password are required', 400);
        }

        if (role === 'garage_admin') {
            if (!garage) {
                throw createHttpError('Garage information is required', 400);
            }
            if (!Array.isArray(documents) || documents.length === 0) {
                throw createHttpError('At least one business document is required', 400);
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const emailEnabled = isEmailEnabled();

        const user = await User.create({
            name,
            email,
            phone,
            date_of_birth,
            gender,
            role,
            password_hash: hashedPassword,
            email_verified: !emailEnabled,
            approved: role === 'garage_admin' ? false : true,
        }, {transaction});

        let verificationCode = null;
        if (emailEnabled) {
            verificationCode = generateVerificationCode();
            const hashedCode = hashCode(verificationCode);
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            await EmailVerification.create({
                user_id: user.id,
                token: hashedCode,
                expires_at: expiresAt,
            }, {transaction});
        }

        let garageRecord = null;
        if (user.role === 'garage_admin') {
            garageRecord = await Garage.create({
                owner_user_id: user.id,
                name: garage.name,
                address: garage.address,
                city: garage.city,
                country: garage.country,
                registration_number: garage.registration_number,
            }, {transaction});

            const docsPayload = documents.map(doc => ({
                garage_id: garageRecord.id,
                doc_type: doc.type,
                file_path: doc.file_path || doc.url,
                issued_date: doc.issued_date,
                expiry_date: doc.expiry_date,
            }));

            const createdDocs = await BusinessDocument.bulkCreate(docsPayload, {transaction});
            console.log(`Created ${createdDocs.length} business document(s) for garage ID: ${garageRecord.id}`);

            await user.update({garage_id: garageRecord.id}, {transaction});
        }

        await transaction.commit();

        const emailSent = emailEnabled && verificationCode
            ? await sendVerificationEmail(user.email, verificationCode)
            : false;

        const responseData = {
            message: user.role === 'garage_admin'
                ? (!emailEnabled
                    ? 'Garage admin registered successfully. Pending approval.'
                    : emailSent
                    ? 'Garage admin registered successfully. Pending approval. Please verify your email.'
                    : 'Garage admin registered successfully. Pending approval. Verification email could not be sent now, please request resend.')
                : (emailEnabled
                    ? 'User registered successfully. Please check your email for the verification code.'
                    : 'User registered successfully.'),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                email_verified: user.email_verified,
                role: user.role,
                approved: user.approved,
            },
            email_sent: emailSent,
        };

        if (user.role === 'garage_admin' && garageRecord) {
            const garageWithDocs = await Garage.findByPk(garageRecord.id, {
                include: [{
                    model: BusinessDocument,
                    as: 'documents',
                }],
            });
            responseData.garage = garageWithDocs;
            responseData.documents_count = garageWithDocs?.documents?.length || 0;
        }

        return {
            status: 201,
            data: responseData,
        };
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw err;
    }
};

User.verifyEmail = async ({body}) => {
    const {email, code} = body || {};

    if (!email || !code) {
        throw createHttpError('Email and verification code are required', 400);
    }

    const codeString = String(code).trim();
    if (!/^\d{6}$/.test(codeString)) {
        throw createHttpError('Verification code must be exactly 6 digits', 400);
    }

    const user = await User.findOne({where: {email}});
    if (!user) {
        throw createHttpError('User not found', 404);
    }

    if (user.email_verified) {
        throw createHttpError('Email is already verified', 400);
    }

    const now = new Date();
    const verification = await EmailVerification.findOne({
        where: {
            user_id: user.id,
            used: false,
            expires_at: {
                [Op.gt]: now,
            },
        },
        order: [['created_at', 'DESC']],
    });

    if (!verification) {
        const expiredVerification = await EmailVerification.findOne({
            where: {
                user_id: user.id,
                used: false,
            },
            order: [['created_at', 'DESC']],
        });

        if (expiredVerification) {
            const expiresAt = new Date(expiredVerification.expires_at).getTime();
            const timeDiff = Math.floor((Date.now() - expiresAt) / 1000 / 60);
            console.log(`Verification code expired for user ${user.id}. Expired ${timeDiff} minutes ago.`);
            throw createHttpError('Verification code has expired. Please request a new one.', 400, {
                expired_minutes_ago: timeDiff,
            });
        }

        console.log(`No verification record found for user ${user.id} (${email})`);
        throw createHttpError('No verification code found. Please request a new one.', 400);
    }

    console.log(`Verifying code for user ${user.id}:`);
    console.log(`Input code: ${codeString} (type: ${typeof codeString})`);
    console.log(`Stored hash: ${verification.token.substring(0, 20)}...`);
    const isValidCode = verifyCode(codeString, verification.token);
    console.log(`   Code valid: ${isValidCode}`);

    if (!isValidCode) {
        throw createHttpError('Invalid verification code. Please check the code and try again.', 400);
    }

    await User.update(
        {email_verified: true},
        {where: {id: user.id}}
    );

    await EmailVerification.update(
        {used: true},
        {where: {id: verification.id}}
    );

    return {
        status: 200,
        data: {message: 'Email verified successfully'},
    };
};

User.resendVerificationCode = async ({body}) => {
    if (!isEmailEnabled()) {
        throw createHttpError('Email sending is currently disabled', 400);
    }

    const {email} = body || {};

    if (!email) {
        throw createHttpError('Email is required', 400);
    }

    const user = await User.findOne({where: {email}});
    if (!user) {
        throw createHttpError('User not found', 404);
    }

    if (user.email_verified) {
        throw createHttpError('Email is already verified', 400);
    }

    const verificationCode = generateVerificationCode();
    const hashedCode = hashCode(verificationCode);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await EmailVerification.update(
        {used: true},
        {where: {user_id: user.id, used: false}}
    );

    await EmailVerification.create({
        user_id: user.id,
        token: hashedCode,
        expires_at: expiresAt,
    });

    await sendVerificationEmail(email, verificationCode);

    return {
        status: 200,
        data: {message: 'Verification code sent successfully'},
    };
};

User.login = async ({body}) => {
    const {email, password} = body || {};
    const user = await User.findOne({where: {email}});
    if (!user) {
        throw createHttpError('User not found', 404);
    }

    if (!user.active) {
        throw createHttpError('Account is disabled. Contact your administrator.', 403);
    }

    if (user.role === 'garage_admin' && !user.email_verified) {
        throw createHttpError('Garage admin email is not verified. Please verify your email first.', 403);
    }

    if (user.role === 'garage_admin' && !user.approved) {
        throw createHttpError('Garage admin account is pending approval', 403);
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        throw createHttpError('Invalid credentials', 401);
    }

    const token = jwt.sign(
        {id: user.id, role: user.role},
        process.env.JWT_SECRET,
        {expiresIn: '1h'}
    );

    return {
        status: 200,
        data: {
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                role: user.role,
                email: user.email,
                email_verified: user.email_verified,
                approved: user.approved,
            },
        },
    };
};

User.selectUsers = async () => {
    const users = await User.findAll();
    return {
        status: 200,
        data: users,
    };
};

User.getCurrentUser = async ({user}) => {
    if (!user?.id) {
        throw createHttpError('Authentication required', 401);
    }

    const currentUser = await User.findByPk(user.id, {
        attributes: [
            'id',
            'name',
            'email',
            'phone',
            'gender',
            'date_of_birth',
            'role',
            'email_verified',
            'approved',
            'garage_id',
        ],
        include: [
            {
                model: Garage,
                as: 'garage',
                attributes: ['id', 'name', 'address', 'city', 'country'],
            },
            {
                model: Garage,
                as: 'garage_assignment',
                attributes: ['id', 'name', 'address', 'city', 'country'],
            },
        ],
    });

    if (!currentUser) {
        throw createHttpError('User not found', 404);
    }

    return {
        status: 200,
        data: {
            user: currentUser,
        },
    };
};

User.getRegisterdUserWithAllDetails = async () => {
    const users = await User.findAll({
        include: [
            {
                model: Garage,
                as: 'garage',
                include: [
                    {
                        model: BusinessDocument,
                        as: 'documents',
                    },
                ],
            },
            {
                model: Garage,
                as: 'garage_assignment',
            },
        ],
    });

    return {
        status: 200,
        data: users,
    };
};

User.searchUser = async ({body}) => {
    const {email, phone} = body || {};

    if (!email && !phone) {
        throw createHttpError('Email or phone is required', 400);
    }

    const where = {};
    if (email) {
        where.email = email.trim().toLowerCase();
    }
    if (phone) {
        where.phone = phone.trim();
    }

    const user = await User.findOne({
        where,
        attributes: ['id', 'name', 'email', 'phone', 'role', 'email_verified'],
    });

    if (!user) {
        throw createHttpError('User not found', 404);
    }

    return {
        status: 200,
        data: {
            message: 'User found',
            user,
        },
    };
};

User.updateProfile = async ({body, user}) => {
    if (!user) {
        throw createHttpError('Authentication required', 401);
    }

    const {name, phone, gender, date_of_birth, email} = body || {};
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;

    if (email !== undefined) {
        const existing = await User.findOne({where: {email}});
        if (existing && existing.id !== user.id) {
            throw createHttpError('Email already in use', 400);
        }
        updateData.email = email;
    }

    await User.update(updateData, {where: {id: user.id}});
    const updated = await User.findByPk(user.id, {
        attributes: ['id', 'name', 'email', 'phone', 'gender', 'date_of_birth', 'role'],
    });

    return {
        status: 200,
        data: {
            message: 'Profile updated successfully',
            user: updated,
        },
    };
};

User.changePassword = async ({body, user}) => {
    if (!user) {
        throw createHttpError('Authentication required', 401);
    }

    const {old_password, new_password} = body || {};
    if (!old_password || !new_password) {
        throw createHttpError('old_password and new_password are required', 400);
    }

    const dbUser = await User.findByPk(user.id);
    if (!dbUser) {
        throw createHttpError('User not found', 404);
    }

    const match = await bcrypt.compare(old_password, dbUser.password_hash);
    if (!match) {
        throw createHttpError('Old password is incorrect', 401);
    }

    dbUser.password_hash = await bcrypt.hash(new_password, 10);
    await dbUser.save();

    return {
        status: 200,
        data: {message: 'Password updated successfully'},
    };
};

User.createGarageAdmin = async ({body, user}) => {
    if (user?.role !== 'super_admin') {
        throw createHttpError('Only super admins can create garage admins', 403);
    }

    const {
        name,
        email,
        phone,
        password,
        gender,
        date_of_birth,
        garage_id,
    } = body || {};

    if (!name || !email || !password) {
        throw createHttpError('Name, email, and password are required', 400);
    }

    const existing = await User.findOne({where: {email}});
    if (existing) {
        throw createHttpError('Email already in use', 400);
    }

    if (garage_id) {
        const garage = await Garage.findByPk(garage_id);
        if (!garage) {
            throw createHttpError('garage_id not found', 404);
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await User.create({
        name,
        email,
        phone,
        gender,
        date_of_birth,
        role: 'garage_admin',
        password_hash: hashedPassword,
        garage_id: garage_id || null,
        approved: false,
    });

    return {
        status: 201,
        data: {
            message: 'Garage admin created successfully. Awaiting approval.',
            user: {
                id: newAdmin.id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
                approved: newAdmin.approved,
                garage_id: newAdmin.garage_id,
            },
        },
    };
};

User.listPendingGarageAdmins = async ({user}) => {
    if (user?.role !== 'super_admin') {
        throw createHttpError('Only super admins can view pending garage admins', 403);
    }

    const admins = await User.findAll({
        where: {role: 'garage_admin', approved: false},
        order: [['created_at', 'DESC']],
        attributes: [
            'id',
            'name',
            'email',
            'phone',
            'role',
            'garage_id',
            'approved',
            'email_verified',
            'created_at',
            'updated_at',
        ],
        include: [
            {
                model: Garage,
                as: 'garage',
                include: [
                    {
                        model: BusinessDocument,
                        as: 'documents',
                    },
                ],
            },
            {
                model: Garage,
                as: 'garage_assignment',
            },
        ],
    });

    return {
        status: 200,
        data: admins,
    };
};

User.approveGarageAdmin = async ({params, user}) => {
    if (user?.role !== 'super_admin') {
        throw createHttpError('Only super admins can approve garage admins', 403);
    }

    const {id} = params || {};
    const admin = await User.findByPk(id);
    if (!admin || admin.role !== 'garage_admin') {
        throw createHttpError('Garage admin not found', 404);
    }

    admin.approved = true;
    admin.approved_at = new Date();
    admin.approved_by_user_id = user.id;
    await admin.save();

    return {
        status: 200,
        data: {
            message: 'Garage admin approved successfully',
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                approved: admin.approved,
            },
        },
    };
};

User.rejectGarageAdmin = async ({params, user}) => {
    if (user?.role !== 'super_admin') {
        throw createHttpError('Only super admins can reject garage admins', 403);
    }

    const {id} = params || {};
    const admin = await User.findByPk(id);
    if (!admin || admin.role !== 'garage_admin') {
        throw createHttpError('Garage admin not found', 404);
    }

    await admin.destroy();

    return {
        status: 200,
        data: {
            message: 'Garage admin rejected and removed',
            deleted_id: id,
        },
    };
};

User.createMechanic = async ({body, user}) => {
    if (!user || (user.role !== 'garage_admin' && user.role !== 'super_admin')) {
        throw createHttpError('Only garage admins or super admins can create workers', 403);
    }

    const {
        name,
        email,
        phone,
        password,
        gender,
        date_of_birth,
        garage_id,
    } = body || {};

    if (!name || !email || !password) {
        throw createHttpError('Name, email, and password are required', 400);
    }

    const existing = await User.findOne({where: {email}});
    if (existing) {
        throw createHttpError('Email already in use', 400);
    }

    let resolvedGarageId = garage_id ? Number(garage_id) : null;

    if (user.role === 'garage_admin') {
        const ownedGarages = await Garage.findAll({
            where: {owner_user_id: user.id},
            attributes: ['id'],
        });
        const ownedGarageIds = [...new Set([
            ...ownedGarages.map((garage) => garage.id),
            ...(user.garage_id ? [user.garage_id] : []),
        ])];

        if (ownedGarageIds.length === 0) {
            throw createHttpError('No garage found for this garage admin. Please onboard a garage first.', 400);
        }

        if (!resolvedGarageId) {
            resolvedGarageId = ownedGarageIds[0];
        }

        if (!ownedGarageIds.includes(resolvedGarageId)) {
            throw createHttpError('You can only assign workers to your own garages', 403);
        }
    } else {
        if (!resolvedGarageId) {
            throw createHttpError('garage_id is required to create a worker', 400);
        }
        const garage = await Garage.findByPk(resolvedGarageId);
        if (!garage) {
            throw createHttpError('garage_id not found', 404);
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const autoVerifyEmail = user.role === 'garage_admin';

    const serviceTechnician = await User.create({
        name,
        email,
        phone,
        gender,
        date_of_birth,
        role: 'service_technician',
        password_hash: hashedPassword,
        garage_id: resolvedGarageId,
        email_verified: autoVerifyEmail,
        approved: true,
    });

    return {
        status: 201,
        data: {
            message: 'Worker created successfully',
            user: {
                id: serviceTechnician.id,
                name: serviceTechnician.name,
                email: serviceTechnician.email,
                email_verified: serviceTechnician.email_verified,
                role: serviceTechnician.role,
                garage_id: serviceTechnician.garage_id,
            },
        },
    };
};

User.listMechanics = async ({query, user}) => {
    if (!user || (user.role !== 'garage_admin' && user.role !== 'super_admin')) {
        throw createHttpError('Only garage admins or super admins can view workers', 403);
    }

    let garageIdFilter = query?.garage_id ? Number(query.garage_id) : null;
    const whereClause = {role: 'service_technician'};

    if (user.role === 'garage_admin') {
        const ownedGarages = await Garage.findAll({
            where: {owner_user_id: user.id},
            attributes: ['id'],
        });

        const ownedGarageIds = [...new Set([
            ...ownedGarages.map((garage) => garage.id),
            ...(user.garage_id ? [user.garage_id] : []),
        ])];

        if (ownedGarageIds.length === 0) {
            throw createHttpError('No garage found for this garage admin', 400);
        }

        if (garageIdFilter) {
            if (!ownedGarageIds.includes(garageIdFilter)) {
                throw createHttpError('You can only view workers in your own garages', 403);
            }
            whereClause.garage_id = garageIdFilter;
        } else {
            whereClause.garage_id = {[Op.in]: ownedGarageIds};
        }
    } else if (garageIdFilter) {
        whereClause.garage_id = garageIdFilter;
    }

    const serviceTechnicians = await User.findAll({
        where: whereClause,
        include: [
            {
                model: Garage,
                as: 'garage_assignment',
                attributes: ['id', 'name', 'city'],
            },
        ],
        order: [['created_at', 'DESC']],
    });

    return {
        status: 200,
        data: serviceTechnicians,
    };
};

User.updateMechanic = async ({params, body, user}) => {
    if (!user || (user.role !== 'garage_admin' && user.role !== 'super_admin')) {
        throw createHttpError('Only garage admins or super admins can update workers', 403);
    }

    const {id} = params || {};
    const mechanic = await User.findByPk(id);
    if (!mechanic || mechanic.role !== 'service_technician') {
        throw createHttpError('Worker not found', 404);
    }

    if (user.role === 'garage_admin') {
        const garage = await Garage.findOne({where: {owner_user_id: user.id}});
        const allowedGarageId = garage?.id || user.garage_id;
        if (!allowedGarageId || mechanic.garage_id !== allowedGarageId) {
            throw createHttpError('You can only update workers in your garage', 403);
        }
    }

    const {name, email, phone, gender, date_of_birth} = body || {};
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (gender !== undefined) updateData.gender = gender;
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;

    if (email !== undefined) {
        const existing = await User.findOne({where: {email}});
        if (existing && existing.id !== mechanic.id) {
            throw createHttpError('Email already in use', 400);
        }
        updateData.email = email;
    }

    await mechanic.update(updateData);

    return {
        status: 200,
        data: {
            message: 'Worker updated successfully',
            user: {
                id: mechanic.id,
                name: mechanic.name,
                email: mechanic.email,
                phone: mechanic.phone,
                gender: mechanic.gender,
                date_of_birth: mechanic.date_of_birth,
                role: mechanic.role,
                garage_id: mechanic.garage_id,
            },
        },
    };
};

User.setMechanicStatus = async ({params, body, user}) => {
    if (!user || (user.role !== 'garage_admin' && user.role !== 'super_admin')) {
        throw createHttpError('Only garage admins or super admins can enable/disable workers', 403);
    }

    const {id} = params || {};
    const {active} = body || {};
    if (active === undefined) {
        throw createHttpError('active flag is required', 400);
    }

    const mechanic = await User.findByPk(id);
    if (!mechanic || mechanic.role !== 'service_technician') {
        throw createHttpError('Worker not found', 404);
    }

    if (user.role === 'garage_admin') {
        const garage = await Garage.findOne({where: {owner_user_id: user.id}});
        const allowedGarageId = garage?.id || user.garage_id;
        if (!allowedGarageId || mechanic.garage_id !== allowedGarageId) {
            throw createHttpError('You can only update workers in your garage', 403);
        }
    }

    mechanic.active = !!active;
    await mechanic.save();

    return {
        status: 200,
        data: {
            message: `Worker ${mechanic.active ? 'enabled' : 'disabled'} successfully`,
            user: {
                id: mechanic.id,
                active: mechanic.active,
            },
        },
    };
};

User.resetMechanicPassword = async ({params, body, user}) => {
    if (!user || (user.role !== 'garage_admin' && user.role !== 'super_admin')) {
        throw createHttpError('Only garage admins or super admins can reset worker passwords', 403);
    }

    const {id} = params || {};
    const {new_password} = body || {};
    if (!new_password) {
        throw createHttpError('new_password is required', 400);
    }

    const mechanic = await User.findByPk(id);
    if (!mechanic || mechanic.role !== 'service_technician') {
        throw createHttpError('Worker not found', 404);
    }

    if (user.role === 'garage_admin') {
        const garage = await Garage.findOne({where: {owner_user_id: user.id}});
        const allowedGarageId = garage?.id || user.garage_id;
        if (!allowedGarageId || mechanic.garage_id !== allowedGarageId) {
            throw createHttpError('You can only reset passwords for workers in your garage', 403);
        }
    }

    mechanic.password_hash = await bcrypt.hash(new_password, 10);
    await mechanic.save();

    return {
        status: 200,
        data: {message: 'Worker password reset successfully'},
    };
};

User.deleteUserWhithAllDetails = async ({params}) => {
    const transaction = await sequelize.transaction();
    try {
        const {id} = params || {};
        const user = await User.findByPk(id, {
            include: [{
                model: Garage,
                as: 'garage',
                include: [{
                    model: BusinessDocument,
                    as: 'documents',
                }],
            }],
        });

        if (!user) {
            throw createHttpError('User not found', 404);
        }

        if (user.garage) {
            if (user.garage.documents && user.garage.documents.length > 0) {
                await BusinessDocument.destroy({
                    where: {garage_id: user.garage.id},
                    transaction,
                });
                console.log(` Deleted ${user.garage.documents.length} business document(s) for garage ID: ${user.garage.id}`);
            }

            await Garage.destroy({
                where: {owner_user_id: user.id},
                transaction,
            });
            console.log(` Deleted garage ID: ${user.garage.id} for user ID: ${id}`);
        }

        await EmailVerification.destroy({
            where: {user_id: id},
            transaction,
        });

        await user.destroy({transaction});

        await transaction.commit();

        return {
            status: 200,
            data: {
                message: 'User and all related data deleted successfully',
                deleted: {
                    user_id: id,
                    garage_deleted: !!user.garage,
                    documents_deleted: user.garage?.documents?.length || 0,
                },
            },
        };
    } catch (err) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw err;
    }
};

module.exports = User;
