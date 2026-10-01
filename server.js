import express from 'express';

const app = express();

app.use(express.static('dist'))

app.get('/hi', (req, res) => {
    res.send('Hi Andy');
})

const PORT = 8080;

app.listen(PORT, () => {
    console.log(`Running on PORT ${PORT}`);
})