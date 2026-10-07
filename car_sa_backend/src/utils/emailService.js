const nodemailer = require('nodemailer');

const EMAIL_ENABLED = String(process.env.EMAIL_ENABLED || 'false').toLowerCase() === 'true';

let transporter = null;

if (EMAIL_ENABLED) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
    });
}

if (transporter) {
    transporter.verify((error) => {
        if(error){
            console.log('Email service error:', error);

        } else{
            console.log('Email service ready');
        }
    });
} else {
    console.log('Email service disabled');
}

const sendVerificationEmail = async (email, verificationCode) => {
    if (!EMAIL_ENABLED || !transporter) {
        return false;
    }

    const mailOptions = {
        from: process.env.EMAIL_FROM || `"CarSa" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email Address - Car SA',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #edf3f7; max-width: 640px; margin: 0 auto; padding: 24px;">
                <div style="background-color: #ffffff; border: 1px solid #dbe5ec; border-radius: 14px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #2F4858 0%, #395c73 100%); padding: 18px 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Welcome to Car SA</h2>
                    </div>
                    <div style="padding: 22px 20px;">
                        <p style="font-size: 16px; color: #2F4858; margin: 0 0 12px 0; line-height: 1.5;">
                            Thank you for registering. Please verify your email address using the code below.
                        </p>
                        <div style="background-color: #fff8f2; border: 1px solid #ffd8b2; border-radius: 12px; padding: 24px; text-align: center; margin: 22px 0;">
                            <p style="font-size: 14px; color: #556b79; margin: 0 0 10px 0;">Your verification code is:</p>
                            <h1 style="font-size: 40px; color: #FE8A21; letter-spacing: 10px; margin: 0; font-weight: 800;">${verificationCode}</h1>
                        </div>
                        <p style="font-size: 14px; color: #556b79; margin: 0 0 14px 0;">
                            Enter this code in the app to complete your registration.
                        </p>
                        <div style="border-top: 1px solid #e8eef3; padding-top: 14px;">
                            <p style="color: #7b8d99; font-size: 12px; margin: 0;">
                                This code will expire in 15 minutes. If you didn't create an account, please ignore this email.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `,
        text: `Welcome to Car SA! Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification code sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

const sendCarRegisterRequestEmail = async (email, requestId, garageName, licensePlate, vehicleData) => {
    if (!EMAIL_ENABLED || !transporter) {
        return false;
    }

    // Create confirmation links that the car owner can click
    const baseUrl = process.env.CAR_OWNER_APP_URL || process.env.API_BASE_URL || 'http://localhost:5001';
    const confirmationLink = `${baseUrl}/api/car-register-requests/${requestId}/confirm`;
    const rejectLink = `${baseUrl}/api/car-register-requests/${requestId}/reject`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || `"CarSa" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Vehicle Registration Request - Car SA',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Vehicle Registration Request</h2>
                <p style="font-size: 16px; color: #555;">${garageName} is requesting to register a vehicle to your account.</p>
                
                <div style="background-color: #f5f5f5; border-radius: 10px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Vehicle Details:</h3>
                    <p><strong>License Plate:</strong> ${licensePlate}</p>
                    ${vehicleData?.make ? `<p><strong>Make:</strong> ${vehicleData.make}</p>` : ''}
                    ${vehicleData?.model ? `<p><strong>Model:</strong> ${vehicleData.model}</p>` : ''}
                    ${vehicleData?.year ? `<p><strong>Year:</strong> ${vehicleData.year}</p>` : ''}
                </div>
                
                <p style="font-size: 16px; color: #555;">Please confirm or reject this request in your app dashboard.</p>
                <p style="font-size: 14px; color: #666;">You can also use the links below (you'll need to be logged in):</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmationLink}" 
                       style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-right: 10px; font-weight: bold;">
                        Confirm Request
                    </a>
                    <a href="${rejectLink}" 
                       style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Reject Request
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #666;">Or visit your app dashboard to manage this request.</p>
                
                <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    This request will expire in 24 hours. If you didn't expect this request, please reject it.
                </p>
            </div>
        `,
        text: `${garageName} is requesting to register a vehicle (${licensePlate}) to your account. Please confirm or reject this request in your app.`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Car registration request notification sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending car registration request email:', error);
        return false;
    }
};

module.exports = {
    isEmailEnabled: () => EMAIL_ENABLED,
    sendVerificationEmail,
    sendCarRegisterRequestEmail,
};
