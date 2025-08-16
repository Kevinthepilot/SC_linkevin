const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid'); 

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/wanted-images', express.static(path.join(__dirname, 'wanted-images')));

// Upload config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'user.html'));
});

//Admin
let photoReviewStack = [];
app.get('/thisisanadminpage', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// Wanted list
let wantedList = [
    { name: "Phạm Gia Phát", img: "/wanted-images/wanted4.jpg", hint: "23116ANHOI123" },
    { name: "Nguyễn Bá Hoài Văn", img: "/wanted-images/wanted2.jpg", hint: "23AN123" },
    { name: "Bùi Nhất Bảo Long", img: "/wanted-images/wanted1.jpg", hint: "26105ICHOI123" },
    { name: "Trương Phú Ninh", img: "/wanted-images/wanted3.jpg", hint: "4MONK123" },
    { name: "Nguyễn Ngọc Linh", img: "/wanted-images/wanted5.jpg", hint: "23116ANHOI123" },
    { name: "Nguyễn Lê Uyên Nhi", img: "/wanted-images/wanted6.jpg", hint: "23AN123" },
    { name: "Trần Ngọc Khánh", img: "/wanted-images/wanted7.jpg", hint: "26105ICHOI123" },
    { name: "Nguyễn Minh Võ Quân", img: "/wanted-images/wanted8.jpg", hint: "4MONK123" },
];
let hints = ["23116ANHOI123","23116ANHOI123","23AN123","23AN123","26105ICHOI123","26105ICHOI123","4MONK123" ,"4MONK123" ]
let backup_hints = ["23116ANHOI123","23116ANHOI123","23AN123","23AN123","26105ICHOI123","26105ICHOI123","4MONK123" ,"4MONK123" ]

// Đổi đối tượng mỗi 15s
let currentIndex = 0;
function getRange() {
    let result = [];
    for (let i = 0; i < 4; i++) {
        let idx = (currentIndex + i) % wantedList.length; // wrap with %
        result.push(wantedList[idx]);
    }
    return result;
}
let currentWanted = getRange();

setInterval(() => {
    currentIndex = (currentIndex + 4) % wantedList.length;
    currentWanted = getRange();
    io.emit('updateWanted', currentWanted);
}, 5000);

// Upload route
let imgHistory = []
app.post('/upload', upload.single('photo'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    const photoId = uuidv4();
    const photoData = { 
        id: req.query.socketId,
        reqId: photoId,
        img: fileUrl
    };
    if (!imgHistory.includes(req.file.originalname)){
        photoReviewStack.push(photoData);
        imgHistory.push(req.file.originalname)
        io.emit('photoStack', photoReviewStack);
        res.json({ success: true });
    }
    else{
        res.json({ success: false });
    }
});

io.on('connection', (socket) => {
    console.log('User connected');
    socket.emit('updateWanted', currentWanted);

    socket.on('adminDecision', (data) => {
        if (data.accepted) {
            randomId =  Math.floor(Math.random() * hints.length)
            socket.broadcast.to(data.userId).emit('decision', { 
                accepted: true,
                hint: hints[randomId]
            });
            hints.splice(randomId, 1)
            if (hints.length == 0) hints = backup_hints
        } else {
            socket.broadcast.to(data.userId).emit('decision', { accepted: false });
        }
        photoReviewStack = photoReviewStack.filter(photo => photo.reqId !== data.requestId);
        socket.emit('photoStack', photoReviewStack);
    });

    socket.on('requestPhotoStack', () => {
        socket.emit('photoStack', photoReviewStack);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



