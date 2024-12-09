import dotenv from 'dotenv';
import {app} from './app.js';
import connectDB from './db/db.js';

dotenv.config({
    path: './.env'
})

connectDB()

.then(() => {

    app.on('error', (error)=>{
        console.log('ERROR: ',error);
        throw error;
    });

    app.get('/', (req, res) => {
        res.send('Server is running');
    });

    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`Server is running at ${process.env.PORT}`);
    });
})

.catch((err) => {
    console.log("mongoDB connection failed! ", err);
})

/* first approach to connect to database using IIFE(Immediately Invoked Function Expression)

import express from 'express'
const app = express();

( async () => {
    try {

        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on('error', (error)=>{
            console.log('ERROR: ',error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        });
        
    } catch (error) {
        console.error('ERROR: ',error);
        throw error;
    }
})()*/