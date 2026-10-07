require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const {connectDB} = require('./config/database');



const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));



require('./models/User');
require('./models/Garage');
require('./models/Vehicle');
require('./models/CarRegisterRequest');
require('./models/Notification');
require('./models/EmailVerification');
require('./models/ServiceCatalog');
require('./models/OilProduct');
require('./models/PushDeviceToken');
require('./models/Service');
require('./models/BusinessDocument');

(async () => {
    await connectDB();
})();


const masterRoutes = require('./routes/master.routes');
const path = require('path');

app.get('/health', (req, res) => {
    res.status(200).json({status: 'ok'});
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Master command endpoint (single controller)
app.use('/', masterRoutes);

module.exports = app;
