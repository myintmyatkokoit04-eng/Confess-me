<?php
// Copy to config/mail.local.php, outside public/. Never commit real credentials.
// Gmail requires two-step verification and an App Password, not your normal password.
return [
    'transport'=>'smtp',
    'host'=>'smtp.gmail.com',
    'port'=>465,
    'encryption'=>'ssl', // ssl=implicit TLS (465), tls=STARTTLS (587)
    'username'=>'YOUR_SENDER@gmail.com',
    'password'=>'YOUR_GOOGLE_APP_PASSWORD',
    'from_email'=>'YOUR_SENDER@gmail.com',
    'from_name'=>'Unsaid',
];
