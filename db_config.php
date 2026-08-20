<?php
/**
 * ==============================================================================
 * Ashab Siraj Polytechnic Institute (ASPI) - Database Configuration
 * ==============================================================================
 * যদি আপনি cPanel বা হোস্টিং ফাইল ম্যানেজারে সরাসরি MySQL ডাটাবেজ লিঙ্ক করতে চান,
 * তাহলে নিচের তথ্যগুলো আপনার cPanel MySQL Database অনুযায়ী পূরণ করুন:
 * ==============================================================================
 */

return [
    'enabled'  => false,                // MySQL সক্রিয় করতে true করুন
    'host'     => 'localhost',          // সাধারণত 'localhost' থাকে
    'port'     => 3306,                 // MySQL Port
    'database' => 'aspi_polytechnic_db',// আপনার ডাটাবেজের নাম (যেমন: cpaneluser_aspi)
    'user'     => 'root',               // ডাটাবেজ ইউজারনেম (যেমন: cpaneluser_admin)
    'password' => '',                   // ডাটাবেজ পাসওয়ার্ড
    'ssl'      => false
];
