require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();
const server = require('http').createServer(app);
const {Server} = require('socket.io');
const cors = require('cors');
const admin = require('firebase-admin');

// FIREBASE RTDB
const serviceAccount = JSON.parse(process.env.FIREBASE_CRED);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sekata-quick-count-default-rtdb.firebaseio.com"
})
const db = admin.database();

app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser());
const io = new Server(server, {
    cors: {
    // origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
})

let dataChart = [];
let totalSuara = {}

db.ref("totalSuara").on("value", (suara) => {
    totalSuara.sah = suara.val().sah;
    totalSuara.tidakSah = suara.val().tidakSah;
    totalSuara.pemilih = suara.val().sah + suara.val().tidakSah;
        io.emit('total suara', totalSuara);

});
db.ref("kandidat").on("value", (snapshot) => {
    dataChart = [
        snapshot.val().pertama.suara,
        snapshot.val().kedua.suara,
        snapshot.val().ketiga.suara,
        snapshot.val().keempat.suara,
        snapshot.val().kelima.suara,
    ];    
    totalSuara.sah = dataChart.reduce((acc, curr) => acc + curr, 0);
    db.ref("totalSuara").update({
        sah: totalSuara.sah,
        pemilih: totalSuara.sah + totalSuara.tidakSah, 
    });
    io.emit('updateChart', dataChart);
});

let dbEndpoints = [
    'kandidat/pertama',
    'kandidat/kedua',
    'kandidat/ketiga',
    'kandidat/keempat',
    'kandidat/kelima'
]
io.on('connection', socket => {
    io.emit('updateChart', dataChart);    
    io.emit('total suara', totalSuara);
    console.log(socket.id);
    socket.on('disconnect', () => {
        console.log("disconnected");
    });

    socket.on('vote', (data) => {
        if(data == "invalid"){
            db.ref("totalSuara").update({
                tidakSah: totalSuara.tidakSah + 1,
            });
        } else {
            data.forEach((vote, index) => {
                if(vote){
                    db.ref(dbEndpoints[index]).update({
                        suara: dataChart[index] + 1
                    })
                }
            });
        }
    })

});


app.get('/', (req, res) => {
    res.send('test');
});

app.post('/api/reset/suara', (req,res)=>{
    db.ref('kandidat').update({
        pertama: {suara: 0},
        kedua: {suara: 0},
        ketiga: {suara: 0},
        keempat: {suara: 0},
        kelima: {suara: 0},
    });
    res.json({msg: "data reseted"})
});

server.listen(3000, () => {
    console.log("** server running **");
});