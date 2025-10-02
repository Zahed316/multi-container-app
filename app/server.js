const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const isDev = process.env.NODE_ENV !== 'production';
let livereload, connectLiveReload, liveReloadServer;
if (isDev) {
    try {
        livereload = require('livereload');
        connectLiveReload = require('connect-livereload');
    } catch (_) {
        // In production image or when dev deps are not installed
    }
}
const app = require('express')();
const moment = require('moment');
require('moment/locale/fa');
const fs = require('fs');
const path = require('path');

// Live Reload configuration (development only)
if (isDev && livereload) {
    liveReloadServer = livereload.createServer();
    liveReloadServer.server.once("connection", () => {
        setTimeout(() => {
            liveReloadServer.refresh("/");
        }, 100);
    });
}

// Frontend route
const FrontRouter = require('./routes/front');

// Set ejs template engine
app.set('view engine', 'ejs');

// Middleware
if (isDev && connectLiveReload) {
    app.use(connectLiveReload());
}
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Make moment available in templates
app.locals.moment = moment;

// i18n middleware (lightweight)
const localesDir = path.join(__dirname, 'locales');
let translations = {};
try {
    const en = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
    const fa = JSON.parse(fs.readFileSync(path.join(localesDir, 'fa.json'), 'utf8'));
    translations = { en, fa };
} catch (e) {
    translations = { en: {}, fa: {} };
}

app.use((req, res, next) => {
    const lang = (req.query.lang === 'fa' || req.query.lang === 'en') ? req.query.lang : 'en';
    res.locals.lang = lang;
    res.locals.dir = lang === 'fa' ? 'rtl' : 'ltr';
    // set moment locale per request
    moment.locale(lang);
    res.locals.moment = moment;
    res.locals.t = (key) => {
        const bundle = translations[lang] || {};
        const enBundle = translations.en || {};
        return (bundle[key] ?? enBundle[key] ?? key);
    };
    // Persian (Jalali) date formatting helper with fallback
    res.locals.formatDate = (date) => {
        if (!date) return '';
        try {
            if (lang === 'fa') {
                const fmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
                    year: 'numeric', month: 'short', day: '2-digit'
                });
                return fmt.format(new Date(date));
            }
        } catch (_) {
            // ignore and fallback to moment
        }
        return moment(date).format('MMM DD, YYYY');
    };
    res.locals.fromNow = (date) => {
        if (!date) return '';
        return moment(date).fromNow();
    };
    next();
});

// Database connection with better error handling
const db = require('./config/keys').mongoProdURI;
mongoose
    .connect(db, { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    })
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(error => {
        console.error('❌ MongoDB Connection Error:', error);
        process.exit(1);
    });

// Lightweight health endpoint for Docker healthcheck
app.get('/health', (req, res) => {
    // 1 = connected, 2 = connecting
    const mongoReady = mongoose.connection.readyState === 1;
    if (mongoReady) {
        return res.status(200).json({ status: 'ok' });
    }
    return res.status(503).json({ status: 'unhealthy' });
});

// Routes
app.use(FrontRouter);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).render('todos', {
        tasks: [],
        error: 'Page not found',
        success: null,
        filters: {
            search: '',
            priority: 'all',
            category: 'all',
            status: 'all',
            sortBy: 'newest'
        },
        categories: []
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ Server Error:', error);
    res.status(500).render('todos', {
        tasks: [],
        error: 'failedToLoad',
        success: null,
        filters: {
            search: '',
            priority: 'all',
            category: 'all',
            status: 'all',
            sortBy: 'newest'
        },
        categories: []
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} to view the app`);
});