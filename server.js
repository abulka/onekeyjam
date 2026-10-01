import express from 'express';

const app = express();

app.get('/hi', (req, res) => {
    res.send('Hi Andy');
})

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Running on PORT ${PORT}`);
})

app.use(express.static('dist'))