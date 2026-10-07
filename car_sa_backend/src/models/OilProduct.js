const {DataTypes} = require('sequelize');
const {sequelize} = require('../config/database');
const {createHttpError} = require('../utils/httpError');

const OilProduct = sequelize.define('OilProduct', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: DataTypes.STRING(150), allowNull: false},
    brand: {type: DataTypes.STRING(100), allowNull: false},
    grade: {type: DataTypes.STRING(50), allowNull: true},
    category: {
        type: DataTypes.ENUM('engine_oil', 'gearbox_oil', 'transmission_oil', 'other'),
        allowNull: false,
        defaultValue: 'engine_oil',
    },
    description: {type: DataTypes.TEXT, allowNull: true},
    is_active: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true},
}, {
    tableName: 'oil_products',
    underscored: true,
});

OilProduct.listOilProducts = async ({query}) => {
    const {category, is_active} = query || {};
    const where = {};

    if (category) {
        where.category = category;
    }

    if (is_active !== undefined) {
        where.is_active = String(is_active) !== 'false';
    }

    const products = await OilProduct.findAll({
        where,
        order: [
            ['brand', 'ASC'],
            ['name', 'ASC'],
            ['grade', 'ASC'],
        ],
    });

    return {
        status: 200,
        data: {
            oils: products,
            total: products.length,
        },
    };
};

OilProduct.getOilProductById = async ({params}) => {
    const {id} = params || {};
    const oil = await OilProduct.findByPk(id);

    if (!oil) {
        throw createHttpError('Oil product not found', 404);
    }

    return {
        status: 200,
        data: {oil},
    };
};

OilProduct.createOilProduct = async ({body}) => {
    const {
        name,
        brand,
        grade,
        category,
        description,
        is_active,
    } = body || {};

    if (!name || !brand || !category) {
        throw createHttpError('name, brand and category are required', 400);
    }

    const oil = await OilProduct.create({
        name: String(name).trim(),
        brand: String(brand).trim(),
        grade: grade ? String(grade).trim() : null,
        category,
        description: description ? String(description).trim() : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return {
        status: 201,
        data: {
            message: 'Oil product created successfully',
            oil,
        },
    };
};

OilProduct.updateOilProduct = async ({params, body}) => {
    const {id} = params || {};
    const oil = await OilProduct.findByPk(id);

    if (!oil) {
        throw createHttpError('Oil product not found', 404);
    }

    const {
        name,
        brand,
        grade,
        category,
        description,
        is_active,
    } = body || {};

    if (name !== undefined) oil.name = String(name).trim();
    if (brand !== undefined) oil.brand = String(brand).trim();
    if (grade !== undefined) oil.grade = grade ? String(grade).trim() : null;
    if (category !== undefined) oil.category = category;
    if (description !== undefined) oil.description = description ? String(description).trim() : null;
    if (is_active !== undefined) oil.is_active = Boolean(is_active);

    await oil.save();

    return {
        status: 200,
        data: {
            message: 'Oil product updated successfully',
            oil,
        },
    };
};

OilProduct.deleteOilProduct = async ({params}) => {
    const {id} = params || {};
    const oil = await OilProduct.findByPk(id);

    if (!oil) {
        throw createHttpError('Oil product not found', 404);
    }

    await oil.destroy();

    return {
        status: 200,
        data: {
            message: 'Oil product deleted successfully',
            deleted_id: oil.id,
        },
    };
};

module.exports = OilProduct;
