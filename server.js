const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const multer = require('multer');
const fs = require('fs');

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
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});


// Wanted list
let wantedList = [
    { name: "Nguyễn Văn A", img: "/wanted-images/wanted1.jpg", hint: "Thường xuất hiện ở công viên." },
    { name: "Trần Văn B", img: "/wanted-images/wanted2.jpg", hint: "Hay ghé quán cà phê gần hồ." },
    { name: "Lê Văn C", img: "/wanted-images/wanted3.jpg", hint: "Thích ăn bún bò." }
];
let currentIndex = 0;
let currentWanted = wantedList[currentIndex];

// Đổi đối tượng mỗi 15s
setInterval(() => {
    currentIndex = (currentIndex + 1) % wantedList.length;
    currentWanted = wantedList[currentIndex];
    io.emit('updateWanted', currentWanted);
}, 15000);

// Upload route
app.post('/upload', upload.single('photo'), (req, res) => {
    const fileUrl = `/uploads/${req.file.filename}`;
    const photoData = { 
        id: req.query.socketId,
        img: fileUrl
    };
    photoReviewStack.push(photoData);
    io.emit('photoAdd', photoData);
    res.json({ success: true });
});

io.on('connection', (socket) => {
    console.log('User connected');
    socket.emit('updateWanted', currentWanted);

    socket.on('adminDecision', (data) => {
        if (data.accepted) {
            socket.broadcast.to(data.userId).emit('decision', { 
                accepted: true,
                hint: currentWanted.hint
            });
        } else {
            socket.broadcast.to(data.userId).emit('decision', { accepted: false });
        }
        photoReviewStack = photoReviewStack.filter(photo => photo.id !== data.userId);
    });

    socket.on('requestPhotoStack', () => {
        socket.emit('photoStack', photoReviewStack);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});



