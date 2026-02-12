require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Models
const UserSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    phone: { type: String, unique: true },
    password: { type: String, required: true },
    password: { type: String, required: true },
    groupCode: String,
    role: { type: String, default: 'student' },
    telegramId: { type: String, unique: true, sparse: true } // For Bot Integration
});
const User = mongoose.model('User', UserSchema);

const TestSchema = new mongoose.Schema({
    title: String,
    subject: String, // New: Subject category
    description: String,
    questions: [{
        text: String,
        options: [String],
        correct: String,
        score: { type: Number, default: 5 },
        createdByAI: { type: Boolean, default: false }
    }],
    timeLimit: Number,
    groupCode: String,
    passPercentage: { type: Number, default: 60 }, // New: Configurable passing score
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) }
});
const Test = mongoose.model('Test', TestSchema);

const ResultSchema = new mongoose.Schema({
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: Number,
    totalScore: Number,
    percentage: Number,
    passed: Boolean,
    timeTaken: Number,
    submittedAt: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', ResultSchema);

// Manual Test Creation
app.post('/api/admin/tests/create', async (req, res) => {
    try {
        const { title, subject, timeLimit, groupCode, passPercentage, questions } = req.body;
        const test = new Test({
            title,
            subject: subject || 'Umumiy',
            timeLimit,
            groupCode,
            passPercentage: passPercentage || 60,
            questions: questions.map(q => ({ ...q, createdByAI: false }))
        });
        await test.save();
        res.json({ success: true, test });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Auth Routes
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, phone, password, groupCode } = req.body;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            firstName, lastName, phone, groupCode,
            password: hashedPassword
        });

        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

app.post('/api/login', async (req, res) => {
    const { phone, password } = req.body;

    // Hardcoded Admin
    if (phone === 'xasanali' && password === 'turon30') {
        return res.json({
            success: true,
            user: {
                id: 'admin_id',
                firstName: 'Xasanali',
                lastName: 'Admin',
                role: 'admin'
            }
        });
    }

    try {
        const user = await User.findOne({ phone });
        if (!user) return res.status(401).json({ success: false, error: 'Telefon yoki parol noto\'g\'ri' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Telefon yoki parol noto\'g\'ri' });

        res.json({ success: true, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, groupCode: user.groupCode, role: user.role } });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server xatoligi' });
    }
});

// Test Routes
app.get('/api/tests/student/:groupCode', async (req, res) => {
    const tests = await Test.find({ groupCode: req.params.groupCode });
    res.json({ success: true, tests });
});

app.get('/api/tests/:id', async (req, res) => {
    const test = await Test.findById(req.params.id);
    res.json({ success: true, test });
});

app.post('/api/results/submit', async (req, res) => {
    const { testId, userId, answers } = req.body;
    const test = await Test.findById(testId);
    let score = 0;
    test.questions.forEach((q, i) => {
        if (q.correct === answers[i]) score += q.score;
    });
    const totalScore = test.questions.length * 5;
    const percentage = Math.round((score / totalScore) * 100);
    const result = new Result({
        testId, userId, score, totalScore, percentage, passed: percentage >= (test.passPercentage || 60)
    });
    await result.save();

    res.json({ success: true, result });
});

// Admin Routes
app.get('/api/admin/stats', async (req, res) => {
    const students = await User.countDocuments({ role: 'student' });
    const tests = await Test.countDocuments();
    const results = await Result.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResults = await Result.countDocuments({ submittedAt: { $gte: today } });
    res.json({ success: true, students, tests, results, todayResults });
});

app.get('/api/admin/tests', async (req, res) => {
    const tests = await Test.find();
    res.json({ success: true, tests });
});

app.delete('/api/admin/tests/:id', async (req, res) => {
    await Test.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/admin/results', async (req, res) => {
    const results = await Result.find().populate('userId').populate('testId').sort({ submittedAt: -1 });
    res.json({ success: true, results });
});

app.get('/api/results/my', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ success: false, error: 'User ID required' });
        const results = await Result.find({ userId }).populate('testId').sort({ submittedAt: -1 });
        res.json({ success: true, results });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/admin/results', async (req, res) => {
    try {
        await Result.deleteMany({});
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).sort({ groupCode: 1, lastName: 1 });
        res.json({ success: true, users });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/admin/tests/create', async (req, res) => {
    try {
        const test = new Test(req.body);
        await test.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// AI Generation
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/admin/ai-generate', upload.single('file'), async (req, res) => {
    try {
        const { subject, count, timeLimit, groupCode, passPercentage } = req.body;
        let text = "";

        if (req.file) {
            const data = await pdfParse(req.file.buffer);
            text = data.text;
        }

        const prompt = `Matndan foydalanib ${count} ta test savoli yarat. Fan: ${subject}. 
        Javobni JSON formatida ber: [{text: "", options: ["", "", "", ""], correct: ""}]`;

        const aiRes = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "Sen test yaratuvchi yordamchisan. Faqat JSON qaytar." },
                { role: "user", content: prompt + "\n\nMatn:\n" + text.substring(0, 5000) } // Limit text length
            ]
        }, {
            headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}` }
        });

        const content = aiRes.data.choices[0].message.content;
        // Try to extract JSON array
        const jsonMatch = content.match(/\[.*\]/s);
        if (!jsonMatch) throw new Error("AI noto'g'ri format qaytardi");

        const questions = JSON.parse(jsonMatch[0]);
        const test = new Test({
            title: subject + " - AI Test",
            questions: questions.map(q => ({ ...q, createdByAI: true })),
            timeLimit,
            groupCode,
            passPercentage: passPercentage || 60
        });
        await test.save();
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Sockets for Live Monitoring & WebRTC
const onlineUsers = {};

io.on('connection', (socket) => {
    socket.on('auth', (user) => {
        if (!user) return;
        onlineUsers[socket.id] = { ...user, status: 'online', lastSeen: new Date(), socketId: socket.id };
        io.emit('online_update', onlineUsers);
    });

    // Test Progress
    socket.on('test_action', (data) => {
        const user = onlineUsers[socket.id];
        if (user) {
            if (data.type === 'start') {
                user.testStatus = 'taking';
                user.testId = data.testId;
                user.testTitle = data.testTitle; // Make sure to send title from client
                user.progress = 0;
            } else if (data.type === 'progress') {
                user.progress = data.progress;
            } else if (data.type === 'finish') {
                user.testStatus = 'finished';
            }
            io.emit('online_update', onlineUsers);
        }
    });

    // WebRTC Signaling
    socket.on('screen_offer', (data) => {
        // Data contains: targetSocketId, offer
        io.to(data.targetSocketId).emit('screen_offer', {
            offer: data.offer,
            fromSocketId: socket.id,
            userName: onlineUsers[socket.id] ? `${onlineUsers[socket.id].firstName} ${onlineUsers[socket.id].lastName}` : 'Student'
        });
    });

    socket.on('screen_answer', (data) => {
        io.to(data.targetSocketId).emit('screen_answer', {
            answer: data.answer,
            fromSocketId: socket.id
        });
    });

    socket.on('screen_candidate', (data) => {
        io.to(data.targetSocketId).emit('screen_candidate', {
            candidate: data.candidate,
            fromSocketId: socket.id
        });
    });

    socket.on('stop_sharing', () => {
        const user = onlineUsers[socket.id];
        if (user) {
            user.isSharing = false;
            io.emit('online_update', onlineUsers);
        }
    });

    socket.on('start_sharing', () => {
        const user = onlineUsers[socket.id];
        if (user) {
            user.isSharing = true;
            io.emit('online_update', onlineUsers);
        }
    });

    socket.on('join_stream', (data) => {
        // Admin wants to view student's screen
        // data.targetSocketId is student's socket
        io.to(data.targetSocketId).emit('join_stream', {
            adminSocketId: socket.id
        });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('online_update', onlineUsers);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
