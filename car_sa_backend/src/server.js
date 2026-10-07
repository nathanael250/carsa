const app = require('./app');
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces

app.listen(PORT, HOST, ()=>{
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Access locally at http://localhost:${PORT}`);
    console.log(`Access from network at http://192.168.1.113:${PORT}`);
});