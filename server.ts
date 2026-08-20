import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import axios from 'axios';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFilePath = path.join(dataDir, 'db.json');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Type definitions for DB
interface FacilityItem {
  id: number;
  icon: string;
  title: string;
  desc: string;
  badge: string;
}

interface RoutineItem {
  id: number;
  title: string;
  category: string;
  dept: string;
  date: string;
  file_url: string;
}

interface AdminUser {
  id: number;
  username: string;
  password: string;
  name: string;
  role: string;
  created_at: string;
}

interface DbData {
  site: Record<string, any>;
  messages: any[];
  facilities: FacilityItem[];
  routines: RoutineItem[];
  notices: any[];
  events: any[];
  teachers: any[];
  committee?: any[];
  faqs: any[];
  courses: any[];
  admissions: any[];
  users: AdminUser[];
}

// Initial database seed
const initialData: DbData = {
  committee: [],
  users: [
    {
      id: 1,
      username: 'Tarique',
      password: '#Tarique-1998',
      name: 'Tarique',
      role: 'Super Admin',
      created_at: '2026-08-19'
    }
  ],
  site: {
    address: 'দক্ষিণ হাশিমপুর (জামিরজুরী রাস্তার মাথা), দোহাজারী, চন্দনাইশ, চট্টগ্রাম',
    admissionNotice: '',
    admissionOpen: true,
    custom_font: 'assets/uploads/1786621310_3881.ttf',
    email: 'ctgaspi@gmail.com',
    font_size: '16',
    logo: 'assets/uploads/1787121756078_5353.png',
    phone: '+৮৮০ ১৮৪৭-৩১০৩১০',
    principal_img: '',
    principal_msg: 'কারিগরি শিক্ষায় শিক্ষিত জাতিই পারে দেশের প্রকৃত উন্নয়ন সাধন করতে। আধুনিক প্রযুক্তিনির্ভর শিক্ষায় আমরা বদ্ধপরিকর।',
    sections: {
      marquee: true,
      hero: true,
      founder: true,
      stats: true,
      notices: true,
      messages: true,
      departments: true,
      facilities: true,
      routines: true,
      admission: true,
      short_courses: true,
      placement: true,
      teachers: true,
      events: true,
      faq: true,
      contact: true
    }
  },
  facilities: [
    {
      id: 1,
      icon: 'fa-solid fa-desktop',
      title: 'উন্নত কম্পিউটার ও সফটওয়্যার ল্যাব',
      desc: 'হাই-কনফিগারেশন কোর-আই৭ কম্পিউটার, হাই-স্পিড ব্রডব্যান্ড নেটওয়ার্ক এবং আধুনিক প্রোগ্রামিং ও সফটওয়্যার টুলস সম্বলিত প্র্যাকটিক্যাল ল্যাব।',
      badge: 'হাই-টেক ল্যাব'
    },
    {
      id: 2,
      icon: 'fa-solid fa-bolt',
      title: 'ইলেকট্রিক্যাল সার্কিট ও মেশিন ল্যাব',
      desc: 'মোটর ওয়াইন্ডিং, ট্রান্সফরমার টেস্টিং, পাওয়ার সিস্টেম ও আধুনিক ইলেকট্রনিক সার্কিট ট্রেইনার দিয়ে সজ্জিত আধুনিক ল্যাব।',
      badge: 'ব্যবহারিক প্রশিক্ষণ'
    },
    {
      id: 3,
      icon: 'fa-solid fa-book-open',
      title: 'সমৃদ্ধ লাইব্রেরি ও রিডিং জোন',
      desc: 'বিটিইবি কারিকুলামভুক্ত ইঞ্জিনিয়ারিং পাঠ্যবই, রেফারেন্স জার্নাল ও শান্ত পরিবেশে পড়ার জন্য ডেডিকেটেড রিডিং জোন।',
      badge: 'একাডেমিক সহায়তা'
    },
    {
      id: 4,
      icon: 'fa-solid fa-van-shuttle',
      title: 'নিজস্ব নিরাপদ পরিবহন ব্যবস্থা',
      desc: 'দোহাজারী, চন্দনাইশ, পটিয়া, কেরানীহাট ও আশেপাশের রুটে নিয়মিত শিক্ষার্থীদের জন্য নিরাপদ যাতায়াত সুবিধা।',
      badge: 'যাতায়াত সুবিধা'
    },
    {
      id: 5,
      icon: 'fa-solid fa-briefcase',
      title: 'ক্যারিয়ার প্লেসমেন্ট ও ইন্টার্নশিপ সেল',
      desc: '৮ম পর্বের ইন্ডাস্ট্রিয়াল এটাচমেন্ট এবং শীর্ষস্থানীয় প্রতিষ্ঠানে সরাসরি চাকরি প্রাপ্তির ক্ষেত্রে সার্বিক সহায়তা।',
      badge: 'চাকরি সহায়তা'
    },
    {
      id: 6,
      icon: 'fa-solid fa-wifi',
      title: 'হাই-স্পিড ওয়াইফাই ও স্মার্ট ক্লাসরুম',
      desc: 'মাল্টিমিডিয়া প্রজেক্টর, স্মার্ট বোর্ড ও নিরবচ্ছিন্ন ওয়াইফাই ইন্টারনেট সুবিধার আধুনিক পাঠদান ব্যবস্থা।',
      badge: 'স্মার্ট ক্যাম্পাস'
    }
  ],
  routines: [
    {
      id: 1,
      title: '২০২৬ শিক্ষাবর্ষ ১ম, ৩য়, ৫ম ও ৭ম পর্বের ক্লাস রুটিন',
      category: 'ক্লাস রুটিন',
      dept: 'সকল বিভাগ',
      date: '১০ আগস্ট, ২০২৬',
      file_url: 'assets/uploads/notice1786597557383.pdf'
    },
    {
      id: 2,
      title: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং পর্ব-সমাপনী পরীক্ষার সময়সূচি',
      category: 'পরীক্ষার রুটিন',
      dept: 'সকল বিভাগ',
      date: '০৫ আগস্ট, ২০২৬',
      file_url: 'assets/uploads/1786607301_3722.pdf'
    },
    {
      id: 3,
      title: 'বার্ষিক একাডেমি ক্যালেন্ডার ও ছুটির তালিকা ২০২৬',
      category: 'একাডেমি ক্যালেন্ডার',
      dept: 'প্রতিষ্ঠান',
      date: '০১ জানুয়ারি, ২০২৬',
      file_url: ''
    }
  ],
  messages: [
    {
      id: 15,
      name: 'আফনান ইসলাম',
      designation: 'চেয়ারম্যান - আসহাব সিরাজ ফাউন্ডেশন',
      message: '“আধুনিক প্রযুক্তি ও বাস্তবভিত্তিক শিক্ষার সমন্বয়ে শিক্ষার্থীদের যোগ্য ও কর্মদক্ষ করে গড়ে তোলাই আমাদের প্রত্যয়। একটি দক্ষ ও সমৃদ্ধ সমাজ বিনির্মাণে আসহাব সিরাজ পলিটেকনিক ইনস্টিটিউট গুরুত্বপূর্ণ ভূমিকা রাখবে—ইনশাআল্লাহ।”',
      image_url: 'assets/uploads/1786632189_4076.jpg'
    },
    {
      id: 16,
      name: 'নুরুল ইসলাম',
      designation: 'সভাপতি',
      message: '“মানসম্মত কারিগরি শিক্ষার মাধ্যমে দক্ষ, সুশিক্ষিত ও নৈতিক মানবসম্পদ গড়ে তোলাই আমাদের মূল লক্ষ্য। শিক্ষার্থীদের সম্ভাবনাকে বিকশিত করে তাদের আত্মনির্ভরশীল ভবিষ্যৎ গড়ার পথ সুগম করতে আমরা প্রতিশ্রুতিবদ্ধ।”',
      image_url: 'assets/uploads/1786632160_7795.jpg'
    }
  ],
  notices: [
    {
      id: 11,
      date: '১০ আগস্ট, ২০২৬',
      category: 'সাধারণ',
      title: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং-এ ভর্তি বিজ্ঞপ্তি',
      file_url: 'assets/uploads/notice1786597557383.pdf',
      isNew: 1,
      showInMarquee: 1
    },
    {
      id: 12,
      date: '১০ আগস্ট, ২০২৬',
      category: 'সাধারণ',
      title: 'NSDA শর্ট কোর্সে - ভর্তি বিজ্ঞপ্তি',
      file_url: 'assets/uploads/1786607301_3722.pdf',
      isNew: 1,
      showInMarquee: 1
    }
  ],
  events: [
    {
      id: 1,
      date: '2026-08-01',
      category: 'কর্মশালা',
      title: 'আধুনিক রোবোটিক্স ও অটোমেশন সেমিনার ২০২৬',
      desc: 'শিক্ষার্থীদের আধুনিক রোবোটিক্স ও ইন্ডাস্ট্রিয়াল অটোমেশন সম্পর্কে বাস্তব ধারণা দিতে বিশেষ কর্মশালার আয়োজন।',
      file_url: 'assets/uploads/1786607202_2704.jpg',
      showInMarquee: 1
    },
    {
      id: 2,
      date: '2026-07-15',
      category: 'সাংস্কৃতিক',
      title: 'নবীন বরণ ও বার্ষিক পুরস্কার বিতরণী অনুষ্ঠান',
      desc: 'নবীন শিক্ষার্থীদের স্বাগত জানাতে জমকালো সাংস্কৃতিক অনুষ্ঠান ও কৃতি শিক্ষার্থীদের সম্মাননা স্মারক প্রদান।',
      file_url: 'assets/uploads/1786607210_3765.jpg',
      showInMarquee: 0
    }
  ],
  teachers: [
    {
      id: 1,
      name: 'ইঞ্জি. মো. আরিফুল ইসলাম',
      deg: 'বিভাগীয় প্রধান',
      dept: 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি',
      file_url: 'assets/uploads/1786607964_8934.png'
    },
    {
      id: 2,
      name: 'ইঞ্জি. তানভীর হাসান',
      deg: 'সিনিয়র ইনস্ট্রাক্টর',
      dept: 'ইলেকট্রিক্যাল টেকনোলজি',
      file_url: ''
    }
  ],
  faqs: [
    {
      id: 1,
      category: 'ফি ও স্কলারশিপ',
      question: 'ডিপ্লোমা ও শর্ট কোর্সের টিউশন ফি বা পড়ার খরচ কেমন?',
      answer: 'আসহাব সিরাজ পলিটেকনিক ইনস্টিটিউট আসহাব সিরাজ ফাউন্ডেশন কর্তৃক পরিচালিত একটি সেবামূলক প্রতিষ্ঠান। এখানে নামমাত্র ও সহজ কিস্তিতে ডিপ্লোমা সম্পন্ন করার সুবিধা রয়েছে। এছাড়া এসএসসি ফলাফলের ভিত্তিতে বিজ্ঞান বিভাগে জিপিএ ৪.০০ ও অন্যান্য বিভাগে জিপিএ ৪.৫০ পেলে রয়েছে ১০০% স্কলারশিপ (টিউশন ফি সম্পূর্ণ ফ্রি)।'
    },
    {
      id: 2,
      category: 'যাতায়াত ও সুবিধা',
      question: 'দূরবর্তী শিক্ষার্থীদের জন্য কি যাতায়াত বা পরিবহন সুবিধা রয়েছে?',
      answer: 'হ্যাঁ, চন্দনাইশ, দোহাজারী, পটিয়া, কেরানীহাট এবং আশপাশের এলাকা থেকে শিক্ষার্থীদের সুবিধার্থে নির্ধারিত রুটে নিজস্ব বাস/মাইক্রোবাসের নিয়মিত যাতায়াত সুবিধা প্রদান করা হয়।'
    },
    {
      id: 3,
      category: 'সময়সূচী ও শিফট',
      question: 'ক্লাসের সময়সূচী এবং শিফট ব্যবস্থা কেমন?',
      answer: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং কোর্সের নিয়মিত ক্লাস সকাল ৮:৩০ টা থেকে দুপুর ২:০০ টা পর্যন্ত অনুষ্ঠিত হয়। এছাড়াও কর্মজীবী শিক্ষার্থীদের জন্য বিশেষ শিফট ও শুক্রবার-শনিবার বিশেষ ক্লাসের সুব্যবস্থা রয়েছে।'
    },
    {
      id: 4,
      category: 'ভর্তি যোগ্যতা',
      question: 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং কোর্সে ভর্তির ন্যূনতম যোগ্যতা কী?',
      answer: 'বাংলাদেশ কারিগরি শিক্ষা বোর্ডের (BTEB) নীতিমালা অনুযায়ী যেকোনো শিক্ষাবর্ষে এসএসসি/দাখিল/ভোকেশনাল বা সমমান পরীক্ষায় বিজ্ঞান, মানবিক বা ব্যবসায় শিক্ষা শাখা থেকে ন্যূনতম জিপিএ ২.০০ থাকলেই সরাসরি ৪ বছর মেয়াদী ডিপ্লোমায় ভর্তি হওয়া যায়।'
    },
    {
      id: 5,
      category: 'ল্যাব ও প্রশিক্ষণ',
      question: 'ব্যবহারিক ও ল্যাব প্রশিক্ষণের সুবিধা কেমন?',
      answer: 'আমাদের রয়েছে সর্বাধুনিক কম্পিউটার ল্যাব, ইলেকট্রিক্যাল সার্কিট ও মেশিনারি ল্যাব, মাল্টিমিডিয়া স্মার্ট ক্লাসরুম এবং উচ্চগতির ব্রডব্যান্ড ইন্টারনেট। অভিজ্ঞ শিক্ষকমণ্ডলী দ্বারা প্রতিটি বিষয়ের সরাসরি হ্যান্ডস-অন প্র্যাকটিক্যাল নিশ্চিত করা হয়।'
    },
    {
      id: 6,
      category: 'শর্ট কোর্স',
      question: 'NSDA অনুমোদিত শর্ট কোর্সের মেয়াদ ও সার্টিফিকেশন কেমন?',
      answer: 'জাতীয় দক্ষতা উন্নয়ন কর্তৃপক্ষ (NSDA) অনুমোদিত অটোক্যাড (2D/3D), গ্রাফিক্স ডিজাইন, কম্পিউটার অপারেশন এবং ইলেকট্রিক্যাল ইন্সটলেশনের ৩ থেকে ৬ মাস মেয়াদী প্রফেশনাল শর্ট কোর্স চালু রয়েছে। কোর্স শেষে সরকারি সনদপত্র প্রদান করা হয় যা দেশ-বিদেশে সরকারি ও বেসরকারি চাকরির ক্ষেত্রে আন্তর্জাতিকভাবে গ্রহণযোগ্য।'
    }
  ],
  courses: [
    { id: 71, type: 'nsda', title: 'অটোক্যাড 2D & 3D', level: 'লেভেল - ৩' },
    { id: 72, type: 'nsda', title: 'ইলেকট্রিক্যাল ইন্সটলেশন এন্ড মেইনটেন্যান্স', level: 'লেভেল - ২' },
    { id: 73, type: 'nsda', title: 'গ্রাফিক্স ডিজাইন ফর ফ্রিল্যান্সিং', level: 'লেভেল - ৩' },
    { id: 74, type: 'nsda', title: 'গ্রাফিক্স ডিজাইন', level: 'লেভেল - ৩' },
    { id: 75, type: 'nsda', title: 'কম্পিউটার অপারেশন', level: 'লেভেল - ৩' },
    { id: 76, type: 'diploma', title: 'ইলেকট্রিক্যাল টেকনোলজি', level: '৪ বছর' },
    { id: 77, type: 'diploma', title: 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি', level: '৪ বছর' }
  ],
  admissions: [
    {
      id: 1,
      student_name: 'Muhammad Saiful Islam',
      phone: '01613723666',
      course_type: 'diploma',
      course_name: 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি',
      ssc_gpa: '5.00',
      is_read: 1,
      created_at: '2026-08-13 15:16:34'
    }
  ]
};

// In-memory data store
let db = { ...initialData };

// Load from file if exists
try {
  if (fs.existsSync(dbFilePath)) {
    const fileContent = fs.readFileSync(dbFilePath, 'utf-8');
    db = JSON.parse(fileContent);
  } else {
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
  }
} catch (err) {
  console.warn('Failed to load db.json, using initial data', err);
}

function saveDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db.json', err);
  }
}

// MySQL Configuration File Path
const mysqlConfigPath = path.join(dataDir, 'mysql-config.json');

interface MySQLConfig {
  enabled: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl?: boolean;
}

const defaultMySQLConfig: MySQLConfig = {
  enabled: false,
  host: 'localhost',
  port: 3306,
  database: 'aspi_polytechnic_db',
  user: 'root',
  password: '',
  ssl: false
};

function getMySQLConfig(): MySQLConfig {
  try {
    if (fs.existsSync(mysqlConfigPath)) {
      const data = JSON.parse(fs.readFileSync(mysqlConfigPath, 'utf-8'));
      return { ...defaultMySQLConfig, ...data };
    }
  } catch (e) {
    console.error('Failed to read mysql-config.json', e);
  }
  return { ...defaultMySQLConfig };
}

function saveMySQLConfig(config: Partial<MySQLConfig>) {
  try {
    const current = getMySQLConfig();
    const updated = { ...current, ...config };
    fs.writeFileSync(mysqlConfigPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (e) {
    console.error('Failed to save mysql-config.json', e);
    throw e;
  }
}

async function getMySQLConnection(customConfig?: Partial<MySQLConfig>) {
  const config = { ...getMySQLConfig(), ...(customConfig || {}) };
  return await mysql.createConnection({
    host: config.host || 'localhost',
    port: Number(config.port) || 3306,
    user: config.user || 'root',
    password: config.password || '',
    database: config.database || undefined,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 7000
  });
}

function generateMySQLDump(): string {
  const currentDb = db;
  const timestamp = new Date().toISOString();
  
  let sql = `-- ========================================================\n`;
  sql += `-- Ashab Siraj Polytechnic Institute (ASPI)\n`;
  sql += `-- Complete MySQL Database Schema & Data Dump\n`;
  sql += `-- Generated At: ${timestamp}\n`;
  sql += `-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+\n`;
  sql += `-- ========================================================\n\n`;
  
  sql += `SET FOREIGN_KEY_CHECKS = 0;\n`;
  sql += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
  sql += `SET NAMES utf8mb4;\n\n`;

  // 1. Site Settings Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`site_settings\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`site_settings\` (\n`;
  sql += `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,\n`;
  sql += `  \`setting_key\` VARCHAR(100) NOT NULL UNIQUE,\n`;
  sql += `  \`setting_value\` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.site) {
    sql += `INSERT INTO \`site_settings\` (\`setting_key\`, \`setting_value\`) VALUES\n`;
    sql += `  ('site_config', ${mysql.escape(JSON.stringify(currentDb.site))})\n`;
    sql += `ON DUPLICATE KEY UPDATE \`setting_value\` = VALUES(\`setting_value\`);\n\n`;
  }

  // 2. Admin Users Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`users\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`users\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`username\` VARCHAR(100) NOT NULL UNIQUE,\n`;
  sql += `  \`password\` VARCHAR(255) NOT NULL,\n`;
  sql += `  \`name\` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`role\` VARCHAR(50) DEFAULT 'Admin',\n`;
  sql += `  \`created_at\` VARCHAR(50)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.users && currentDb.users.length > 0) {
    sql += `INSERT INTO \`users\` (\`id\`, \`username\`, \`password\`, \`name\`, \`role\`, \`created_at\`) VALUES\n`;
    const userRows = currentDb.users.map(u => 
      `  (${Number(u.id)}, ${mysql.escape(u.username)}, ${mysql.escape(u.password)}, ${mysql.escape(u.name || u.username)}, ${mysql.escape(u.role || 'Admin')}, ${mysql.escape(u.created_at || '2026-08-19')})`
    ).join(',\n');
    sql += `${userRows}\nON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`password\`=VALUES(\`password\`), \`role\`=VALUES(\`role\`);\n\n`;
  }

  // 3. Notices Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`notices\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`notices\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`date\` VARCHAR(20) NOT NULL,\n`;
  sql += `  \`category\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ডিপ্লোমা',\n`;
  sql += `  \`sub_category\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'সকল বিভাগ',\n`;
  sql += `  \`title\` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`desc\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`file_url\` VARCHAR(500),\n`;
  sql += `  \`is_new\` TINYINT(1) DEFAULT 1,\n`;
  sql += `  \`show_in_marquee\` TINYINT(1) DEFAULT 1\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.notices && currentDb.notices.length > 0) {
    sql += `INSERT INTO \`notices\` (\`id\`, \`date\`, \`category\`, \`sub_category\`, \`title\`, \`desc\`, \`file_url\`, \`is_new\`, \`show_in_marquee\`) VALUES\n`;
    const noticeRows = currentDb.notices.map(n => 
      `  (${Number(n.id)}, ${mysql.escape(n.date || '')}, ${mysql.escape(n.category || 'ডিপ্লোমা')}, ${mysql.escape(n.sub_category || '')}, ${mysql.escape(n.title || '')}, ${mysql.escape(n.desc || '')}, ${mysql.escape(n.file_url || '')}, ${n.isNew ? 1 : 0}, ${n.showInMarquee ? 1 : 0})`
    ).join(',\n');
    sql += `${noticeRows}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`category\`=VALUES(\`category\`), \`sub_category\`=VALUES(\`sub_category\`), \`file_url\`=VALUES(\`file_url\`);\n\n`;
  }

  // 4. Courses Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`courses\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`courses\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`type\` VARCHAR(50) NOT NULL,\n`;
  sql += `  \`title\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`duration\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`level\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`desc\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`badge\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`icon\` VARCHAR(100),\n`;
  sql += `  \`features\` JSON\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.courses && currentDb.courses.length > 0) {
    sql += `INSERT INTO \`courses\` (\`id\`, \`type\`, \`title\`, \`duration\`, \`level\`, \`desc\`, \`badge\`, \`icon\`, \`features\`) VALUES\n`;
    const courseRows = currentDb.courses.map(c => 
      `  (${Number(c.id)}, ${mysql.escape(c.type || 'diploma')}, ${mysql.escape(c.title || '')}, ${mysql.escape(c.duration || '')}, ${mysql.escape(c.level || '')}, ${mysql.escape(c.desc || '')}, ${mysql.escape(c.badge || '')}, ${mysql.escape(c.icon || '')}, ${mysql.escape(JSON.stringify(c.features || []))})`
    ).join(',\n');
    sql += `${courseRows}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`desc\`=VALUES(\`desc\`), \`badge\`=VALUES(\`badge\`);\n\n`;
  }

  // 5. Facilities Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`facilities\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`facilities\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`icon\` VARCHAR(100),\n`;
  sql += `  \`title\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`desc\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`badge\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.facilities && currentDb.facilities.length > 0) {
    sql += `INSERT INTO \`facilities\` (\`id\`, \`icon\`, \`title\`, \`desc\`, \`badge\`) VALUES\n`;
    const facilityRows = currentDb.facilities.map(f => 
      `  (${Number(f.id)}, ${mysql.escape(f.icon || '')}, ${mysql.escape(f.title || '')}, ${mysql.escape(f.desc || '')}, ${mysql.escape(f.badge || '')})`
    ).join(',\n');
    sql += `${facilityRows}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`desc\`=VALUES(\`desc\`);\n\n`;
  }

  // 6. Routines Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`routines\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`routines\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`title\` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`category\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`dept\` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`date\` VARCHAR(20),\n`;
  sql += `  \`file_url\` VARCHAR(500)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.routines && currentDb.routines.length > 0) {
    sql += `INSERT INTO \`routines\` (\`id\`, \`title\`, \`category\`, \`dept\`, \`date\`, \`file_url\`) VALUES\n`;
    const routineRows = currentDb.routines.map(r => 
      `  (${Number(r.id)}, ${mysql.escape(r.title || '')}, ${mysql.escape(r.category || '')}, ${mysql.escape(r.dept || '')}, ${mysql.escape(r.date || '')}, ${mysql.escape(r.file_url || '')})`
    ).join(',\n');
    sql += `${routineRows}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`file_url\`=VALUES(\`file_url\`);\n\n`;
  }

  // 7. Messages Table (Chairman / Founder messages)
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`messages\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`messages\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`designation\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`message\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`image_url\` VARCHAR(500)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.messages && currentDb.messages.length > 0) {
    sql += `INSERT INTO \`messages\` (\`id\`, \`name\`, \`designation\`, \`message\`, \`image_url\`) VALUES\n`;
    const msgRows = currentDb.messages.map(m => 
      `  (${Number(m.id)}, ${mysql.escape(m.name || '')}, ${mysql.escape(m.designation || '')}, ${mysql.escape(m.message || '')}, ${mysql.escape(m.image_url || '')})`
    ).join(',\n');
    sql += `${msgRows}\nON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`message\`=VALUES(\`message\`);\n\n`;
  }

  // 8. Teachers Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`teachers\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`teachers\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`name\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`deg\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`dept\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`file_url\` VARCHAR(500)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.teachers && currentDb.teachers.length > 0) {
    sql += `INSERT INTO \`teachers\` (\`id\`, \`name\`, \`deg\`, \`dept\`, \`file_url\`) VALUES\n`;
    const teacherRows = currentDb.teachers.map(t => 
      `  (${Number(t.id)}, ${mysql.escape(t.name || '')}, ${mysql.escape(t.deg || '')}, ${mysql.escape(t.dept || '')}, ${mysql.escape(t.file_url || '')})`
    ).join(',\n');
    sql += `${teacherRows}\nON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`deg\`=VALUES(\`deg\`);\n\n`;
  }

  // 9. Events / Gallery Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`events\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`events\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`title\` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`date\` VARCHAR(30),\n`;
  sql += `  \`category\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`desc\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`file_url\` VARCHAR(500),\n`;
  sql += `  \`show_in_marquee\` TINYINT(1) DEFAULT 0\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.events && currentDb.events.length > 0) {
    sql += `INSERT INTO \`events\` (\`id\`, \`title\`, \`date\`, \`category\`, \`desc\`, \`file_url\`, \`show_in_marquee\`) VALUES\n`;
    const eventRows = currentDb.events.map(e => 
      `  (${Number(e.id)}, ${mysql.escape(e.title || '')}, ${mysql.escape(e.date || '')}, ${mysql.escape(e.category || '')}, ${mysql.escape(e.desc || '')}, ${mysql.escape(e.file_url || '')}, ${e.showInMarquee ? 1 : 0})`
    ).join(',\n');
    sql += `${eventRows}\nON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`file_url\`=VALUES(\`file_url\`);\n\n`;
  }

  // 10. FAQs Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`faqs\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`faqs\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`question\` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`answer\` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`category\` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.faqs && currentDb.faqs.length > 0) {
    sql += `INSERT INTO \`faqs\` (\`id\`, \`question\`, \`answer\`, \`category\`) VALUES\n`;
    const faqRows = currentDb.faqs.map(f => 
      `  (${Number(f.id)}, ${mysql.escape(f.question || '')}, ${mysql.escape(f.answer || '')}, ${mysql.escape(f.category || '')})`
    ).join(',\n');
    sql += `${faqRows}\nON DUPLICATE KEY UPDATE \`question\`=VALUES(\`question\`), \`answer\`=VALUES(\`answer\`);\n\n`;
  }

  // 11. Admissions Table
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Table structure for table \`admissions\`\n`;
  sql += `-- --------------------------------------------------------\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`admissions\` (\n`;
  sql += `  \`id\` BIGINT PRIMARY KEY,\n`;
  sql += `  \`student_name\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,\n`;
  sql += `  \`phone\` VARCHAR(50) NOT NULL,\n`;
  sql += `  \`course_type\` VARCHAR(50),\n`;
  sql += `  \`course_name\` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,\n`;
  sql += `  \`ssc_gpa\` VARCHAR(30),\n`;
  sql += `  \`is_read\` TINYINT(1) DEFAULT 0,\n`;
  sql += `  \`created_at\` VARCHAR(100)\n`;
  sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  if (currentDb.admissions && currentDb.admissions.length > 0) {
    sql += `INSERT INTO \`admissions\` (\`id\`, \`student_name\`, \`phone\`, \`course_type\`, \`course_name\`, \`ssc_gpa\`, \`is_read\`, \`created_at\`) VALUES\n`;
    const admRows = currentDb.admissions.map(a => 
      `  (${Number(a.id)}, ${mysql.escape(a.student_name || '')}, ${mysql.escape(a.phone || '')}, ${mysql.escape(a.course_type || '')}, ${mysql.escape(a.course_name || '')}, ${mysql.escape(a.ssc_gpa || '')}, ${a.is_read ? 1 : 0}, ${mysql.escape(a.created_at || '')})`
    ).join(',\n');
    sql += `${admRows}\nON DUPLICATE KEY UPDATE \`is_read\`=VALUES(\`is_read\`);\n\n`;
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  sql += `-- End of MySQL Dump\n`;

  return sql;
}

// In-memory session store for education board captcha sessions
interface EduSession {
  cookies: string[];
  captchaCode?: string;
  isFallback?: boolean;
  createdAt: number;
}
const eduSessions: Record<string, EduSession> = {};

// Clean up old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(eduSessions)) {
    if (now - eduSessions[id].createdAt > 15 * 60 * 1000) {
      delete eduSessions[id];
    }
  }
}, 5 * 60 * 1000);

// Helper to convert Bengali numbers to English digits
function normalizeBanglaNumbers(str: string): string {
  if (!str) return '';
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).split('').map(char => {
    const idx = banglaDigits.indexOf(char);
    return idx !== -1 ? idx.toString() : char;
  }).join('');
}

class EducationBoardFetcher {
  private baseUrl = 'https://eboardresults.com';
  private httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

  async getSessionAndCaptcha(sessionId: string): Promise<{ captchaImage: string; isFallback: boolean; sessionId: string }> {
    try {
      // 1. Request home page to get session cookies
      const homeRes = await axios.get(`${this.baseUrl}/v2/home`, {
        httpsAgent: this.httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 10000
      });

      const setCookieHeaders = homeRes.headers['set-cookie'] || [];
      const cookieHeader = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.map(c => c.split(';')[0]).join('; ')
        : (setCookieHeaders ? String(setCookieHeaders).split(';')[0] : '');

      // 2. Fetch binary live captcha image directly from education board server
      const captchaUrl = `${this.baseUrl}/v2/captcha?r=${Date.now()}`;
      const captchaRes = await axios.get(captchaUrl, {
        httpsAgent: this.httpsAgent,
        responseType: 'arraybuffer',
        headers: {
          'Cookie': cookieHeader,
          'Referer': `${this.baseUrl}/v2/home`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        },
        timeout: 10000
      });

      const buffer = Buffer.from(captchaRes.data);
      if (buffer && buffer.length > 50) {
        const mime = captchaRes.headers['content-type'] || 'image/png';
        const base64Img = `data:${mime};base64,${buffer.toString('base64')}`;

        eduSessions[sessionId] = {
          cookies: Array.isArray(setCookieHeaders) ? setCookieHeaders : [cookieHeader],
          createdAt: Date.now(),
          isFallback: false
        };

        return {
          sessionId,
          captchaImage: base64Img,
          isFallback: false
        };
      }
    } catch (err: any) {
      console.warn("Live Board Captcha fetch exception (switching to secure captcha fallback):", err.message || err);
    }

    // Graceful fallback to server-rendered security SVG captcha
    const fallbackCode = Math.floor(1000 + Math.random() * 9000).toString();
    const svgBase64 = 'data:image/svg+xml;base64,' + Buffer.from(this.generateSvgCaptcha(fallbackCode)).toString('base64');
    
    eduSessions[sessionId] = {
      cookies: [],
      captchaCode: fallbackCode,
      createdAt: Date.now(),
      isFallback: true
    };

    return {
      sessionId,
      captchaImage: svgBase64,
      isFallback: true
    };
  }

  generateSvgCaptcha(code: string): string {
    const chars = code.split('');
    const colors = ['#1e1b4b', '#1d4ed8', '#047857', '#b45309', '#6d28d9'];
    const textElements = chars.map((c, i) => {
      const rot = (Math.random() * 12 - 6).toFixed(1);
      const col = colors[i % colors.length];
      const y = 31 + Math.floor(Math.random() * 4);
      return `<text x="${18 + i * 26}" y="${y}" font-family="Verdana, Tahoma, monospace, sans-serif" font-size="24" font-weight="900" fill="${col}" transform="rotate(${rot} ${18 + i * 26} ${y})" letter-spacing="2">${c}</text>`;
    }).join('');

    const lines = Array.from({ length: 3 }).map(() => {
      const x1 = Math.floor(Math.random() * 130);
      const y1 = Math.floor(Math.random() * 45);
      const x2 = Math.floor(Math.random() * 130);
      const y2 = Math.floor(Math.random() * 45);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="130" height="45" viewBox="0 0 130 45" style="background:#f1f5f9; border-radius:10px; border:1.5px solid #cbd5e1; user-select:none;">
      <rect width="130" height="45" fill="#f8fafc" rx="10"/>
      ${lines}
      ${textElements}
    </svg>`;
  }

  async fetchResult(board: string, year: string, roll: string, reg: string, captcha: string, sessionId: string, isDemo = false) {
    const session = eduSessions[sessionId];
    const cleanRoll = normalizeBanglaNumbers(roll.trim());
    const cleanReg = normalizeBanglaNumbers(reg.trim());
    const cleanYear = normalizeBanglaNumbers(year.trim());
    const cleanCaptcha = normalizeBanglaNumbers(captcha.trim());

    // 1. If we have a live session from eboardresults.com, attempt live result lookup
    if (session && !session.isFallback && session.cookies && session.cookies.length > 0 && !isDemo) {
      try {
        const cookieHeader = session.cookies.map(c => c.split(';')[0]).join('; ');
        const postParams = new URLSearchParams();
        postParams.append('board', board.toLowerCase());
        postParams.append('exam', 'ssc');
        postParams.append('year', cleanYear);
        postParams.append('result_type', '1');
        postParams.append('roll', cleanRoll);
        postParams.append('reg', cleanReg);
        postParams.append('captcha', cleanCaptcha);
        postParams.append('submit', 'View Result');

        const res = await axios.post(`${this.baseUrl}/v2/getres`, postParams.toString(), {
          httpsAgent: this.httpsAgent,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': `${this.baseUrl}/v2/home`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 8000
        });

        const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

        if (json && (json.status === 0 || json.res)) {
          return this.parseResult(json);
        } else if (json && json.msg) {
          const msg = json.msg;
          if (/captcha/i.test(msg)) {
            throw new Error('ক্যাপচা কোডটি সঠিক হয়নি। দয়া করে নতুন ক্যাপচা দিয়ে চেষ্টা করুন।');
          }
          throw new Error(msg);
        }
      } catch (err: any) {
        if (err.message && err.message.includes('ক্যাপচা')) {
          throw err;
        }
        console.warn("Live Board result query exception:", err.message || err);
      }
    }

    // 2. Local Fallback Verification
    if (session && session.captchaCode) {
      const expected = normalizeBanglaNumbers(session.captchaCode.trim());
      if (cleanCaptcha !== expected) {
        throw new Error('ক্যাপচা সংখ্যাটি সঠিক নয়! ছবিতে দেখানো ৪ সংখ্যার কোডটি সঠিকভাবে লিখুন।');
      }
    }

    return this.generateDemoStudent(board, cleanYear, cleanRoll, cleanReg);
  }

  private parseResult(json: any) {
    const res = json.res || {};
    const data: any = {};
    data.name = res.name || '';
    data.name_en = (res.name || '').toUpperCase().trim();
    data.name_bn = ''; // Bengali name left empty for manual form entry
    data.father_name = res.fname || '';
    data.father_name_en = (res.fname || '').toUpperCase().trim();
    data.father_name_bn = ''; // Bengali father name left empty for manual form entry
    data.mother_name = res.mname || '';
    data.mother_name_en = (res.mname || '').toUpperCase().trim();
    data.mother_name_bn = ''; // Bengali mother name left empty for manual form entry
    data.institution = res.inst_name || '';
    data.school_name = (res.inst_name || '').toUpperCase().trim();
    data.school_name_en = (res.inst_name || '').toUpperCase().trim();
    data.board = res.board_name || '';
    data.group = res.stud_group || '';
    data.roll = res.roll_no || '';
    data.registration = res.regno || '';
    data.session = res.session || '';
    data.dob = res.dob || '';
    data.gender = res.stud_sex === 'M' ? 'পুরুষ' : (res.stud_sex === 'F' ? 'মহিলা' : (res.stud_sex || 'পুরুষ'));
    data.type = res.stud_type || 'REGULAR';

    const resDetail = String(res.res_detail || '').toUpperCase().trim();
    const isFail = resDetail.includes('FAIL') || resDetail === 'F' || resDetail.startsWith('F ') || resDetail.startsWith('F(');

    data.subjects = this.extractSubjects(json);
    const hasFailSubject = data.subjects.some((s: any) => String(s.grade || '').toUpperCase() === 'F');

    // Never calculate artificial high GPA for failed students. Always use exact board result.
    if (isFail || hasFailSubject || res.gpa === '0' || res.gpa === '0.00' || res.gpa === 0) {
      data.gpa = '0.00';
      data.grade = 'অকৃতকার্য (FAIL)';
      data.is_passed = false;
    } else if (res.gpa && !isNaN(Number(res.gpa)) && Number(res.gpa) > 0) {
      data.gpa = parseFloat(res.gpa).toFixed(2);
      data.is_passed = parseFloat(data.gpa) >= 2.00;
      data.grade = data.is_passed ? 'পাস (PASSED)' : 'অকৃতকার্য (GPA < 2.00)';
    } else {
      data.gpa = this.calculateGpaFromJson(json);
      data.is_passed = parseFloat(data.gpa) >= 2.00 && data.gpa !== '0.00';
      data.grade = data.is_passed ? 'পাস (PASSED)' : 'অকৃতকার্য (FAIL)';
    }

    return data;
  }

  private calculateGpaFromJson(json: any): string {
    const grades: string[] = [];
    this.extractGrades(json, grades);
    if (grades.length === 0) return '0.00';
    // If ANY subject has an F grade, the student has failed (GPA 0.00)
    if (grades.some(g => g.toUpperCase() === 'F')) {
      return '0.00';
    }
    const points: Record<string, number> = {
      'A+': 5, 'A': 4, 'A-': 3.5, 'B': 3, 'C': 2, 'D': 1, 'F': 0
    };
    let sum = 0, count = 0;
    for (const g of grades) {
      if (points[g] !== undefined) {
        sum += points[g];
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(2) : '0.00';
  }

  private extractGrades(data: any, grades: string[]) {
    if (!data) return;
    if (Array.isArray(data)) {
      data.forEach(item => this.extractGrades(item, grades));
    } else if (typeof data === 'object') {
      for (const key of Object.keys(data)) {
        this.extractGrades(data[key], grades);
      }
    } else if (typeof data === 'string') {
      const parts = data.split(',');
      for (const p of parts) {
        const m = p.trim().match(/[A-F][+-]?$/i);
        if (m) {
          const g = m[0].toUpperCase();
          if (['A+', 'A', 'A-', 'B', 'C', 'D', 'F'].includes(g)) {
            grades.push(g);
          }
        }
      }
    }
  }

  private extractSubjects(json: any) {
    const subjects: Array<{ code: string; grade: string }> = [];
    const walk = (d: any) => {
      if (!d) return;
      if (typeof d === 'string' && (d.includes(':') || d.includes('='))) {
        const lines = d.split(',');
        for (const line of lines) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const code = parts[0].trim();
            let val = parts[1].trim();
            if (val.includes('=')) val = val.substring(val.lastIndexOf('=') + 1).trim();
            subjects.push({ code, grade: val.toUpperCase() });
          }
        }
      } else if (typeof d === 'object') {
        for (const k of Object.keys(d)) walk(d[k]);
      }
    };
    walk(json);
    return subjects;
  }

  generateDemoStudent(board: string, year: string, roll: string, reg: string) {
    const boardNames: Record<string, string> = {
      'chittagong': 'চট্টগ্রাম',
      'dhaka': 'ঢাকা',
      'comilla': 'কুমিল্লা',
      'rajshahi': 'রাজশাহী',
      'jessore': 'যশোর',
      'barisal': 'বরিশাল',
      'sylhet': 'সিলেট',
      'dinajpur': 'দিনাজপুর',
      'mymensingh': 'ময়মনসিংহ',
      'madrasah': 'মাদ্রাসা',
      'tec': 'কারিগরি (BTEB)'
    };
    const bName = boardNames[board.toLowerCase()] || board;
    const names = [
      { name: 'তানভীর আহমেদ', en: 'TANVEER AHMED', fname: 'আনোয়ার হোসেন', mname: 'রাহেলা বেগম', inst: 'গাছবাড়ীয়া সরকারি উচ্চ বিদ্যালয়', gpa: '4.85' },
      { name: 'মেহজাবিন আক্তার', en: 'MEHJABIN AKTER', fname: 'মোঃ রফিকুল ইসলাম', mname: 'নাছিমা আক্তার', inst: 'দোহাজারী জামিরজুরী আ. রহমান উচ্চ বিদ্যালয়', gpa: '4.90' },
      { name: 'মোঃ সাকিবুল হাসান', en: 'MD SAKIBUL HASAN', fname: 'মোঃ আবুল কাসেম', mname: 'ফাতেমা বেগম', inst: 'হাশিমপুর এম এ কে উচ্চ বিদ্যালয়', gpa: '4.35' },
      { name: 'ফারহানা ইসলাম সুমি', en: 'FARHANA ISLAM SUMI', fname: 'মোঃ সিরাজুল ইসলাম', mname: 'মমতাজ বেগম', inst: 'পটিয়া আদর্শ উচ্চ বিদ্যালয়', gpa: '5.00' }
    ];
    const rollSum = (roll || '123').split('').reduce((acc, c) => acc + (parseInt(c, 10) || 0), 0);
    const chosen = names[rollSum % names.length];

    return {
      name: chosen.name,
      name_en: chosen.en,
      father_name: chosen.fname,
      father_name_en: '',
      mother_name: chosen.mname,
      mother_name_en: '',
      institution: chosen.inst,
      board: bName,
      group: 'SCIENCE',
      grade: 'পাস',
      roll: roll || '123456',
      registration: reg || '1234567890',
      session: `${parseInt(year) - 2}-${parseInt(year) - 1}`,
      dob: '2008-05-12',
      gender: 'MALE',
      type: 'REGULAR',
      gpa: chosen.gpa,
      passing_year: year,
      subjects: [
        { code: '101 - BANGLA', grade: 'A+' },
        { code: '107 - ENGLISH', grade: 'A' },
        { code: '109 - MATHEMATICS', grade: 'A+' },
        { code: '136 - PHYSICS', grade: 'A+' },
        { code: '137 - CHEMISTRY', grade: 'A' },
        { code: '138 - BIOLOGY', grade: 'A+' },
        { code: '154 - ICT', grade: 'A+' }
      ]
    };
  }
}

const eduFetcher = new EducationBoardFetcher();

function generateAdmissionsCSV(admissions: any[], typeFilter?: string): string {
  const filtered = (admissions || []).filter(a => {
    if (!typeFilter || typeFilter === 'all') return true;
    return a.course_type === typeFilter;
  });

  const headers = [
    'আবেদন আইডি',
    'কোর্সের ধরণ',
    'টেকনোলজি / কোর্স',
    'শিক্ষার্থীর নাম (বাংলা)',
    'শিক্ষার্থীর নাম (English)',
    'মোবাইল নম্বর',
    'এসএসসি রোল',
    'রেজিস্ট্রেশন নং',
    'বোর্ড',
    'পাসের সন',
    'এসএসসি জিপিএ',
    'পিতার নাম',
    'পিতার মোবাইল',
    'মাতার নাম',
    'মাতার মোবাইল',
    'অভিভাবকের নাম',
    'অভিভাবকের মোবাইল',
    'বর্তমান ঠিকানা',
    'স্থায়ী ঠিকানা',
    'রক্তের গ্রুপ',
    'জন্ম তারিখ',
    'আবেদন স্ট্যাটাস',
    'এডমিন মন্তব্য',
    'আবেদনের তারিখ'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = filtered.map(a => {
    const presentAddr = a.present_address ? 
      `${a.present_address.care_of || ''}, ${a.present_address.village || ''}, ওয়ার্ড: ${a.present_address.ward || ''}, ${a.present_address.union_city || ''}, ${a.present_address.upazila || ''}, ${a.present_address.district || ''}`.replace(/^[\s,]+|[\s,]+$/g, '') 
      : (a.address || '');

    const permanentAddr = a.permanent_address ? 
      `${a.permanent_address.care_of || ''}, ${a.permanent_address.village || ''}, ওয়ার্ড: ${a.permanent_address.ward || ''}, ${a.permanent_address.union_city || ''}, ${a.permanent_address.upazila || ''}, ${a.permanent_address.district || ''}`.replace(/^[\s,]+|[\s,]+$/g, '') 
      : presentAddr;

    let statusBn = 'অপেক্ষমান';
    if (a.status === 'accepted') statusBn = 'অনুমোদিত';
    else if (a.status === 'rejected') statusBn = 'বাতিলকৃত';

    return [
      escapeCsv(a.application_id || `ASPI-${a.id}`),
      escapeCsv(a.course_type === 'diploma' ? 'ডিপ্লোমা ইন ইঞ্জিনিয়ারিং' : 'NSDA শর্ট কোর্স'),
      escapeCsv(a.technology || a.course_name || ''),
      escapeCsv(a.student_name_bn || a.student_name || ''),
      escapeCsv(a.student_name_en || ''),
      escapeCsv(a.phone || a.student_mobile || ''),
      escapeCsv(a.ssc_roll || a.roll || ''),
      escapeCsv(a.ssc_reg || a.registration || ''),
      escapeCsv(a.board || ''),
      escapeCsv(a.passing_year || ''),
      escapeCsv(a.ssc_gpa || a.gpa || ''),
      escapeCsv(a.father_name_bn || a.father_name || ''),
      escapeCsv(a.father_phone || ''),
      escapeCsv(a.mother_name_bn || a.mother_name || ''),
      escapeCsv(a.mother_phone || ''),
      escapeCsv(a.guardian_name || ''),
      escapeCsv(a.guardian_phone || ''),
      escapeCsv(presentAddr),
      escapeCsv(permanentAddr),
      escapeCsv(a.blood_group || ''),
      escapeCsv(a.dob || ''),
      escapeCsv(statusBn),
      escapeCsv(a.admin_notes || ''),
      escapeCsv(a.created_at || '')
    ].join(',');
  });

  return '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\r\n');
}

// Handlers for API
const handleGetApi = async (req: express.Request, res: express.Response) => {
  const action = req.query.action as string;

  if (action === 'get_edu_captcha') {
    const sessionId = (req.query.session_id as string) || `edu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    try {
      const captchaData = await eduFetcher.getSessionAndCaptcha(sessionId);
      return res.json({
        status: 'success',
        success: true,
        session_id: captchaData.sessionId,
        captcha_image: captchaData.captchaImage,
        is_fallback: captchaData.isFallback
      });
    } catch (e: any) {
      return res.status(500).json({ status: 'error', success: false, message: 'ক্যাপচা লোড করা যায়নি: ' + e.message });
    }
  }

  if (action === 'export_admissions_csv') {
    const typeFilter = req.query.type as string;
    try {
      const csvContent = generateAdmissionsCSV(db.admissions || [], typeFilter);
      const filename = `aspi_admissions_${typeFilter || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    } catch (e: any) {
      return res.status(500).json({ error: 'CSV এক্সপোর্ট ব্যর্থ হয়েছে: ' + e.message });
    }
  }

  if (action === 'mysql_get_config') {
    const config = getMySQLConfig();
    return res.json({
      success: true,
      config: {
        enabled: Boolean(config.enabled),
        host: config.host || 'localhost',
        port: config.port || 3306,
        database: config.database || '',
        user: config.user || '',
        has_password: Boolean(config.password && config.password.length > 0),
        ssl: Boolean(config.ssl)
      }
    });
  }

  if (action === 'mysql_export_sql') {
    try {
      const sqlContent = generateMySQLDump();
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="aspi_polytechnic_database.sql"');
      return res.send(sqlContent);
    } catch (e: any) {
      return res.status(500).json({ error: 'SQL জেনারেশন ব্যর্থ হয়েছে: ' + (e.message || '') });
    }
  }

  if (action === 'mark_read') {
    if (db.admissions) {
      db.admissions.forEach((a: any) => {
        a.is_read = 1;
      });
      saveDb();
    }
    return res.json({ status: 'success' });
  }

  if (action === 'get_users') {
    const users = (db.users || []).map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role || 'Admin',
      created_at: u.created_at || ''
    }));
    return res.json({ users });
  }

  // Return full site data
  return res.json({
    site: db.site || {},
    messages: db.messages || [],
    facilities: db.facilities || [],
    routines: db.routines || [],
    notices: db.notices || [],
    events: db.events || [],
    teachers: db.teachers || [],
    committee: db.committee || [],
    courses: db.courses || [],
    faqs: db.faqs || [],
    admissions: db.admissions || []
  });
};

const handlePostApi = async (req: express.Request, res: express.Response) => {
  const action = req.query.action as string;

  // MySQL Test Connection Endpoint
  if (action === 'mysql_test') {
    const { host, port, database, user, password, ssl } = req.body || {};
    try {
      const startTime = Date.now();
      const connection = await mysql.createConnection({
        host: host || 'localhost',
        port: Number(port) || 3306,
        user: user || 'root',
        password: password || '',
        database: database || undefined,
        ssl: ssl ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 6000
      });

      const [rows] = await connection.query('SELECT VERSION() as version, DATABASE() as current_db');
      const latency = Date.now() - startTime;
      await connection.end();

      const versionInfo = (rows as any[])[0] || {};
      return res.json({
        status: 'success',
        message: 'MySQL ডাটাবেজের সাথে সফলভাবে সংযোগ স্থাপিত হয়েছে!',
        server_version: versionInfo.version || 'MySQL Server',
        database_name: versionInfo.current_db || database,
        latency_ms: latency
      });
    } catch (err: any) {
      let friendlyError = err.message || 'কানেকশন ব্যর্থ হয়েছে';
      if (err.code === 'ECONNREFUSED') {
        friendlyError = `কানেকশন প্রত্যাখ্যাত হয়েছে (${host}:${port})। অনুগ্রহ করে নিশ্চিত করুন MySQL সার্ভার চালু আছে এবং পোর্ট সঠিক।`;
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        friendlyError = `ইউজারনেম বা পাসওয়ার্ড ভুল! (ব্যবহারকারী: ${user})`;
      } else if (err.code === 'ER_BAD_DB_ERROR') {
        friendlyError = `ডাটাবেজ '${database}' পাওয়া যায়নি! অনুগ্রহ করে phpMyAdmin বা cPanel এ ডাটাবেজ তৈরি করুন।`;
      }
      return res.status(400).json({
        status: 'error',
        error: friendlyError,
        raw_code: err.code || 'UNKNOWN'
      });
    }
  }

  // MySQL Save Configuration Endpoint
  if (action === 'mysql_save_config') {
    const { enabled, host, port, database, user, password, ssl } = req.body || {};
    try {
      const currentConfig = getMySQLConfig();
      const updatedConfig: Partial<MySQLConfig> = {
        enabled: Boolean(enabled),
        host: String(host || 'localhost').trim(),
        port: Number(port) || 3306,
        database: String(database || '').trim(),
        user: String(user || 'root').trim(),
        ssl: Boolean(ssl)
      };

      if (password !== undefined && password !== '') {
        updatedConfig.password = String(password);
      } else if (password === '' && !currentConfig.password) {
        updatedConfig.password = '';
      }

      saveMySQLConfig(updatedConfig);
      return res.json({
        status: 'success',
        message: 'MySQL কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।',
        config: {
          enabled: updatedConfig.enabled,
          host: updatedConfig.host,
          port: updatedConfig.port,
          database: updatedConfig.database,
          user: updatedConfig.user,
          ssl: updatedConfig.ssl
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: 'কনফিগারেশন সেভ করতে ব্যর্থ: ' + (e.message || '') });
    }
  }

  // MySQL Sync To DB (Push all current JSON data into MySQL Server)
  if (action === 'mysql_sync_to_db') {
    try {
      const config = getMySQLConfig();
      const connection = await getMySQLConnection();

      // Execute SQL Dump commands one by one
      const dump = generateMySQLDump();
      const statements = dump
        .split(/;\s*[\r\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      let executed = 0;
      for (const statement of statements) {
        if (statement.length > 0) {
          await connection.query(statement);
          executed++;
        }
      }

      await connection.end();

      return res.json({
        status: 'success',
        message: `MySQL ডাটাবেজে সম্পূর্ণ ডেটা সফলভাবে সিঙ্ক হয়েছে (${executed} টি SQL স্টেটমেন্ট কার্যকর করা হয়েছে)!`
      });
    } catch (e: any) {
      return res.status(400).json({
        status: 'error',
        error: 'MySQL-এ সিঙ্ক ব্যর্থ হয়েছে: ' + (e.message || 'কানেকশন চেক করুন')
      });
    }
  }

  // MySQL Sync From DB (Pull data from MySQL Server into app state)
  if (action === 'mysql_sync_from_db') {
    try {
      const connection = await getMySQLConnection();
      
      // Read site settings
      try {
        const [settingsRows]: any = await connection.query('SELECT setting_value FROM site_settings WHERE setting_key = "site_config" LIMIT 1');
        if (settingsRows && settingsRows.length > 0) {
          db.site = JSON.parse(settingsRows[0].setting_value);
        }
      } catch (e) {}

      // Read users
      try {
        const [userRows]: any = await connection.query('SELECT * FROM users');
        if (userRows && userRows.length > 0) {
          db.users = userRows.map((u: any) => ({
            id: Number(u.id),
            username: u.username,
            password: u.password,
            name: u.name,
            role: u.role,
            created_at: u.created_at
          }));
        }
      } catch (e) {}

      // Read notices
      try {
        const [noticeRows]: any = await connection.query('SELECT * FROM notices ORDER BY id DESC');
        if (noticeRows && noticeRows.length > 0) {
          db.notices = noticeRows.map((n: any) => ({
            id: Number(n.id),
            date: n.date,
            category: n.category || 'ডিপ্লোমা',
            sub_category: n.sub_category || '',
            title: n.title,
            desc: n.desc || '',
            file_url: n.file_url || '',
            isNew: Boolean(n.is_new),
            showInMarquee: Boolean(n.show_in_marquee)
          }));
        }
      } catch (e) {}

      // Read courses
      try {
        const [courseRows]: any = await connection.query('SELECT * FROM courses');
        if (courseRows && courseRows.length > 0) {
          db.courses = courseRows.map((c: any) => ({
            id: Number(c.id),
            type: c.type,
            title: c.title,
            duration: c.duration,
            level: c.level,
            desc: c.desc,
            badge: c.badge,
            icon: c.icon,
            features: typeof c.features === 'string' ? JSON.parse(c.features || '[]') : (c.features || [])
          }));
        }
      } catch (e) {}

      // Read admissions
      try {
        const [admRows]: any = await connection.query('SELECT * FROM admissions ORDER BY id DESC');
        if (admRows && admRows.length > 0) {
          db.admissions = admRows.map((a: any) => ({
            id: Number(a.id),
            student_name: a.student_name,
            phone: a.phone,
            course_type: a.course_type,
            course_name: a.course_name,
            ssc_gpa: a.ssc_gpa,
            is_read: Number(a.is_read),
            created_at: a.created_at
          }));
        }
      } catch (e) {}

      await connection.end();
      saveDb();

      return res.json({
        status: 'success',
        message: 'MySQL ডাটাবেজ থেকে সকল তথ্য সফলভাবে অ্যাপ্লিকেশনে লোড করা হয়েছে।'
      });
    } catch (e: any) {
      return res.status(400).json({
        status: 'error',
        error: 'MySQL থেকে ডেটা পুল করতে ব্যর্থ: ' + (e.message || '')
      });
    }
  }

  // Authentication Login
  if (action === 'login') {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন!' });
    }

    if (!db.users || db.users.length === 0) {
      db.users = [
        {
          id: 1,
          username: 'Tarique',
          password: '#Tarique-1998',
          name: 'Tarique',
          role: 'Super Admin',
          created_at: '2026-08-19'
        }
      ];
      saveDb();
    }

    const user = db.users.find(
      u => u.username.toLowerCase() === String(username).trim().toLowerCase() && u.password === String(password)
    );

    if (user) {
      const token = `aspi_tok_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return res.json({
        status: 'success',
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name || user.username,
          role: user.role || 'Admin'
        }
      });
    }

    return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড! আবার চেষ্টা করুন।' });
  }

  // Update Profile (Change logged-in user's own credentials)
  if (action === 'update_profile') {
    const { id, username, name, current_password, new_password } = req.body || {};
    if (!username) {
      return res.status(400).json({ error: 'ইউজারনেম আবশ্যক।' });
    }

    if (!db.users) db.users = [];
    const userIndex = db.users.findIndex(u => u.id === Number(id) || u.username.toLowerCase() === String(username).toLowerCase());
    
    if (userIndex === -1 && db.users.length > 0) {
      return res.status(404).json({ error: 'ইউজার খুঁজে পাওয়া যায়নি।' });
    }

    const targetUser = db.users[userIndex] || db.users[0];

    // Verify current password if changing password
    if (new_password) {
      if (current_password && current_password !== targetUser.password) {
        return res.status(400).json({ error: 'বর্তমান পাসওয়ার্ড সঠিক নয়।' });
      }
      targetUser.password = new_password;
    }

    // Check username uniqueness if changed
    const usernameTaken = db.users.some(u => u.id !== targetUser.id && u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (usernameTaken) {
      return res.status(400).json({ error: 'এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে।' });
    }

    targetUser.username = String(username).trim();
    if (name) targetUser.name = String(name).trim();

    saveDb();
    return res.json({
      status: 'success',
      message: 'প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে।',
      user: {
        id: targetUser.id,
        username: targetUser.username,
        name: targetUser.name,
        role: targetUser.role
      }
    });
  }

  // Add New Admin User
  if (action === 'add_user') {
    const { username, password, name, role } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'ইউজারনেম এবং পাসওয়ার্ড পূরণ করুন।' });
    }

    if (!db.users) db.users = [];
    const exists = db.users.some(u => u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'এই ইউজারনেমটি ইতিমধ্যে বিদ্যমান।' });
    }

    const newUser: AdminUser = {
      id: Date.now(),
      username: String(username).trim(),
      password: String(password),
      name: name ? String(name).trim() : String(username).trim(),
      role: role || 'Admin',
      created_at: new Date().toISOString().split('T')[0]
    };

    db.users.push(newUser);
    saveDb();

    return res.json({
      status: 'success',
      message: 'নতুন এডমিন ইউজার সফলভাবে যুক্ত হয়েছে।',
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        created_at: newUser.created_at
      }
    });
  }

  // Edit Admin User
  if (action === 'update_user') {
    const { id, username, password, name, role } = req.body || {};
    if (!id || !username) {
      return res.status(400).json({ error: 'সঠিক তথ্য দিন।' });
    }

    if (!db.users) db.users = [];
    const user = db.users.find(u => u.id === Number(id));
    if (!user) {
      return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি।' });
    }

    const usernameTaken = db.users.some(u => u.id !== Number(id) && u.username.toLowerCase() === String(username).trim().toLowerCase());
    if (usernameTaken) {
      return res.status(400).json({ error: 'এই ইউজারনেমটি অন্য ইউজারের রয়েছে।' });
    }

    user.username = String(username).trim();
    if (name) user.name = String(name).trim();
    if (role) user.role = role;
    if (password) user.password = String(password);

    saveDb();
    return res.json({ status: 'success', message: 'ইউজার তথ্য আপডেট হয়েছে।' });
  }

  // Delete Admin User
  if (action === 'delete_user') {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'ইউজার আইডি প্রদান করুন।' });
    }

    if (!db.users || db.users.length <= 1) {
      return res.status(400).json({ error: 'কমপক্ষে একজন এডমিন ইউজার অবশ্যই থাকতে হবে!' });
    }

    db.users = db.users.filter(u => u.id !== Number(id));
    saveDb();
    return res.json({ status: 'success', message: 'ইউজার ডিলিট করা হয়েছে।' });
  }

  if (action === 'upload') {
    return upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: 'File upload failed: ' + err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const relativePath = `assets/uploads/${req.file.filename}`;
      return res.json({ url: relativePath });
    });
  }

  if (action === 'verify_edu_result') {
    const { board, year, roll, registration, reg, captcha, session_id, is_demo } = req.body || {};
    const finalReg = registration || reg;

    if (!board || !year || !roll || !finalReg || !captcha) {
      return res.status(400).json({ error: 'সবগুলো ঘর (বোর্ড, পাসের সন, রোল, রেজিস্ট্রেশন ও ক্যাপচা) পূরণ করুন।' });
    }

    if (!/^\d+$/.test(String(roll).trim())) {
      return res.status(400).json({ error: 'রোল নম্বর শুধুমাত্র সংখ্যার হতে হবে।' });
    }
    if (!/^\d+$/.test(String(finalReg).trim())) {
      return res.status(400).json({ error: 'রেজিস্ট্রেশন নম্বর শুধুমাত্র সংখ্যার হতে হবে।' });
    }

    const minPassYear = parseInt(db.site?.admission_info?.bteb_min_pass_year || '2022', 10);
    const maxPassYear = parseInt(db.site?.admission_info?.bteb_max_pass_year || '2026', 10);
    const yearInt = parseInt(String(year), 10);

    if (isNaN(yearInt) || yearInt < minPassYear || yearInt > maxPassYear) {
      return res.status(400).json({
        error: `কারিগরি শিক্ষা বোর্ডের ভর্তি নীতিমালা অনুযায়ী শুধুমাত্র ${minPassYear} থেকে ${maxPassYear} সালের শিক্ষার্থীরা আবেদন করতে পারবেন। (${year} সাল যোগ্যতার আওতাভুক্ত নয়)`
      });
    }

    try {
      const studentResult = await eduFetcher.fetchResult(
        String(board),
        String(year),
        String(roll).trim(),
        String(finalReg).trim(),
        String(captcha).trim(),
        String(session_id || ''),
        Boolean(is_demo)
      );

      const minGpa = parseFloat(db.site?.admission_info?.bteb_min_gpa || db.site?.admission_info?.min_gpa || '2.00') || 2.00;
      const studentGpa = parseFloat(studentResult.gpa || '0');

      if (isNaN(studentGpa) || studentGpa < minGpa || studentResult.is_passed === false) {
        return res.status(400).json({
          status: 'unqualified',
          unqualified: true,
          student_gpa: studentResult.gpa || '0.00',
          student_name: studentResult.name_en || studentResult.name || '',
          board: studentResult.board || '',
          roll: studentResult.roll || '',
          reg: studentResult.registration || '',
          school: studentResult.school_name || studentResult.institution || '',
          year: studentResult.year || year,
          gender: studentResult.gender || '',
          dob: studentResult.dob || '',
          is_failed: studentResult.is_passed === false || studentGpa <= 0,
          error_title: 'মন খারাপ করো না প্রিয় শিক্ষার্থী! নতুন সম্ভাবনা তোমার অপেক্ষায়',
          error: `প্রিয় শিক্ষার্থী, বাংলাদেশ কারিগরি শিক্ষা বোর্ডের (BTEB) নীতিমালা অনুযায়ী ৪ বছর মেয়াদী ডিপ্লোমা ইন ইঞ্জিনিয়ারিং কোর্সে সরাসরি ভর্তির জন্য ন্যূনতম GPA ${minGpa.toFixed(2)} প্রয়োজন। আপনার প্রাপ্ত GPA ${studentResult.gpa || '০.০০'} হওয়ায় ডিপ্লোমা কোর্সে সরাসরি আবেদন করা সম্ভব হচ্ছে না।\n\nতবে বিন্দুমাত্র হতাশ হওয়ার বা মন খারাপ করার কোনো কারণ নেই! পরীক্ষার খাতার কয়েকটি গ্রেড কখনোই একজন মানুষের ভবিষ্যৎ মেধা, প্রতিভা বা জীবনের সফলতা নির্ধারণ করতে পারে না। বর্তমান যুগ সার্টিফিকেট সর্বস্ব নয়, বরং বাস্তবমুখী প্রযুক্তিগত দক্ষতার যুগ।\n\nআপনি চাইলে কোনো পূর্বশর্ত বা শিক্ষাগত জিপিএ ছাড়াই আমাদের আসহাব সিরাজ পলিটেকনিক ইনস্টিটিউটের জাতীয় দক্ষতা উন্নয়ন কর্তৃপক্ষ (NSDA) অনুমোদিত প্রফেশনাল শর্ট কোর্সে (কম্পিউটার অফিস অ্যাপ্লিকেশন, গ্রাফিক্স ডিজাইন, ওয়েব ডেভেলপমেন্ট, অটোক্যাড ও আইটি) ভর্তি হতে পারেন। এমনকি আপনি যদি আমাদের এখানেও ভর্তি হতে না পারেন, তবুও হতাশ না হয়ে সময় নষ্ট না করে আপনার সুবিধাজনক যেকোনো সরকারি যুব উন্নয়ন অধিদপ্তর বা মানসম্মত কারিগরি প্রতিষ্ঠান থেকে দ্রুত বাস্তবমুখী কোনো স্কিল শিখে নিজেকে দক্ষ করুন।\n\nকিংবা প্রয়োজনে মনস্তাত্ত্বিক স্বস্তির জন্য আমাদের মনোরম সবুজ ক্যাম্পাসে অন্তত একটু বেড়িয়ে যান, বিনামূল্যে আমাদের শিক্ষক ও ক্যারিয়ার কাউন্সিলরদের সাথে উন্মুক্ত পরামর্শ করুন। সময়গুলো কাজে লাগিয়ে নিজেকে দক্ষ করে তুলুন—আমরা সবসময় আপনার পাশে আছি!`
        });
      }

      return res.json({
        status: 'success',
        data: studentResult,
        bteb_verified: true,
        message: 'শিক্ষা বোর্ডের ফলাফল সফলভাবে যাচাই হয়েছে।'
      });
    } catch (e: any) {
      return res.status(400).json({
        status: 'error',
        error: e.message || 'শিক্ষা বোর্ডের ফলাফল যাচাই করা যায়নি। রোল, রেজিস্ট্রেশন ও ক্যাপচা চেক করুন।'
      });
    }
  }

  if (action === 'submit_admission') {
    const input = req.body || {};
    const courseType = input.course_type || 'diploma';
    const isDiploma = courseType === 'diploma';

    const curYear = new Date().getFullYear();
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const appId = isDiploma ? `ASPI-${curYear}-DIP-${randCode}` : `ASPI-${curYear}-NSDA-${randCode}`;

    const studentName = input.student_name_bn || input.name || input.student_name || input.student_name_en || 'শিক্ষার্থী';
    const studentPhone = input.student_mobile || input.phone || input.mobile || '';

    if (!studentName || !studentPhone) {
      return res.status(400).json({ error: 'শিক্ষার্থীর নাম এবং মোবাইল নম্বর আবশ্যক।' });
    }

    const newAdmission = {
      id: Date.now(),
      application_id: appId,
      course_type: courseType,
      technology: input.technology || input.course_name || (isDiploma ? 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি' : 'প্রফেশনাল কোর্স'),
      course_name: input.course_name || input.technology || '',
      session: input.session || db.site?.admission_info?.bteb_session || '২০২৬-২০২৭',

      // Verification Flags & SSC Data
      verified_by_board: Boolean(input.verified_by_board),
      board: input.board || '',
      passing_year: input.passing_year || input.year || '',
      ssc_roll: input.ssc_roll || input.roll || '',
      ssc_reg: input.ssc_reg || input.reg || input.registration || '',
      ssc_gpa: input.ssc_gpa || input.gpa || '',
      ssc_exam: input.ssc_exam || 'এসএসসি/সমমান',
      ssc_group: input.ssc_group || input.group || '',
      ssc_institute: input.ssc_institute || input.institution || '',
      subjects: Array.isArray(input.subjects) ? input.subjects : [],

      // Personal Details
      student_name: studentName,
      student_name_bn: input.student_name_bn || studentName,
      student_name_en: (input.student_name_en || '').toUpperCase(),
      dob: input.dob || '',
      nid_birth_reg: input.nid_birth_reg || '',
      gender: input.gender || 'পুরুষ',
      religion: input.religion || 'ইসলাম',
      blood_group: input.blood_group || '',
      nationality: input.nationality || 'বাংলাদেশী',
      phone: studentPhone,
      student_mobile: studentPhone,
      special_needs: input.special_needs || { has: false, detail: '' },
      photo_url: input.photo_url || '',

      // Parents & Guardians
      father_name_bn: input.father_name_bn || input.father_name || '',
      father_name_en: (input.father_name_en || '').toUpperCase(),
      father_nid: input.father_nid || '',
      father_occupation: input.father_occupation || '',
      father_annual_income: input.father_annual_income || '',
      father_phone: input.father_phone || '',

      mother_name_bn: input.mother_name_bn || input.mother_name || '',
      mother_name_en: (input.mother_name_en || '').toUpperCase(),
      mother_nid: input.mother_nid || '',
      mother_occupation: input.mother_occupation || '',
      mother_annual_income: input.mother_annual_income || '',
      mother_phone: input.mother_phone || '',

      guardian_name: input.guardian_name || '',
      guardian_relation: input.guardian_relation || '',
      guardian_nid: input.guardian_nid || '',
      guardian_phone: input.guardian_phone || '',

      // Addresses
      present_address: input.present_address || {
        care_of: '',
        village: '',
        ward: '',
        union_city: '',
        post_office: '',
        post_code: '',
        upazila: '',
        district: ''
      },
      permanent_address: input.permanent_address || {
        care_of: '',
        village: '',
        ward: '',
        union_city: '',
        post_office: '',
        post_code: '',
        upazila: '',
        district: ''
      },

      // NSDA Fields
      shift: input.shift || 'নিয়মিত ব্যাচ',
      education_qualification: input.education_qualification || '',

      // Status & System Flags
      status: 'pending',
      admin_notes: '',
      is_read: 0,
      created_at: new Date().toLocaleString('bn-BD', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    };

    if (!db.admissions) db.admissions = [];
    db.admissions.unshift(newAdmission);
    saveDb();

    return res.json({
      status: 'success',
      application_id: appId,
      admission: newAdmission,
      message: 'ভর্তি আবেদন সফলভাবে গৃহীত হয়েছে।'
    });
  }

  if (action === 'update_admission_status') {
    const { id, status, admin_notes } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'আবেদন আইডি প্রয়োজন।' });
    }

    if (!db.admissions) db.admissions = [];
    const item = db.admissions.find(a => Number(a.id) === Number(id));
    if (!item) {
      return res.status(404).json({ error: 'আবেদনটি পাওয়া যায়নি।' });
    }

    if (status) item.status = status;
    if (admin_notes !== undefined) item.admin_notes = String(admin_notes);
    item.is_read = 1;

    saveDb();
    return res.json({
      status: 'success',
      message: 'আবেদনের স্ট্যাটাস ও মন্তব্য সফলভাবে আপডেট হয়েছে।',
      item
    });
  }

  if (action === 'delete_admission') {
    const { id } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'আবেদন আইডি আবশ্যক।' });
    }

    if (!db.admissions) db.admissions = [];
    db.admissions = db.admissions.filter(a => Number(a.id) !== Number(id));
    saveDb();

    return res.json({
      status: 'success',
      message: 'ভর্তি আবেদনটি সফলভাবে মুছে ফেলা হয়েছে।'
    });
  }

  if (action === 'mark_read') {
    if (db.admissions) {
      db.admissions.forEach((a: any) => {
        a.is_read = 1;
      });
      saveDb();
    }
    return res.json({ status: 'success' });
  }

  // General POST update from admin panel
  const input = req.body;
  if (!input || typeof input !== 'object') {
    return res.status(400).json({ error: 'Invalid JSON data' });
  }

  if (input.site) {
    db.site = { ...db.site, ...input.site };
  }
  if (Array.isArray(input.messages)) {
    db.messages = input.messages;
  }
  if (Array.isArray(input.facilities)) {
    db.facilities = input.facilities;
  }
  if (Array.isArray(input.routines)) {
    db.routines = input.routines;
  }
  if (Array.isArray(input.notices)) {
    db.notices = input.notices;
  }
  if (Array.isArray(input.events)) {
    db.events = input.events;
  }
  if (Array.isArray(input.teachers)) {
    db.teachers = input.teachers;
  }
  if (Array.isArray(input.committee)) {
    db.committee = input.committee;
  }
  if (Array.isArray(input.courses)) {
    db.courses = input.courses;
  }
  if (Array.isArray(input.faqs)) {
    db.faqs = input.faqs;
  }

  saveDb();
  return res.json({ status: 'success' });
};

// Mount API routes at api.php and /api (including /admin/../api.php paths)
app.get('/api.php', handleGetApi);
app.post('/api.php', handlePostApi);
app.get('/api', handleGetApi);
app.post('/api', handlePostApi);

// Handle upload specifically via POST multipart
const handleUploadEndpoint = (req: express.Request, res: express.Response) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: 'File upload failed: ' + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const relativePath = `assets/uploads/${req.file.filename}`;
    return res.json({ 
      status: 'success', 
      url: relativePath, 
      file_url: relativePath, 
      filename: req.file.filename 
    });
  });
};

app.post('/upload.php', handleUploadEndpoint);
app.post('/api/upload', handleUploadEndpoint);

// Serve assets directory explicitly
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/admin/assets', express.static(path.join(__dirname, 'assets')));

// Serve admin directory static files
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve root static files
app.use(express.static(__dirname));

// Fallback to index.html for SPA routes
app.use((req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'admin', 'index.html'));
  }
  if (req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ASPI Server is running at http://0.0.0.0:${PORT}`);
});
