import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import * as yup from 'yup';
import { nanoid } from 'nanoid';
import monk from 'monk';
import dotenv from 'dotenv'

dotenv.config()

const db = monk( String(process.env.MONGO_URI) );
const urls = db.get('urls')
urls.createIndex({ slug: 1 }, { unique: true })

const app = express();

app.use(helmet());
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json());

app.get('/', (req,res) => {
    res.json({
        message: 'Wellcome to my URL shortener'
    })
});

app.get('/:id', async (req, res, next) => {
    const { id: slug } = req.params
    try {
        const url = await urls.findOne({slug})

        if(url)
            res.redirect(url.url)
        else
            res.redirect(`/?error=${slug} not found`)
    }
    catch(err) {
        res.redirect(`/?error=Link not found`)
    }
})
const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required()
})

app.post('/url', async (req, res, next) => {
    let {slug, url} = req.body;
    try {
        await schema.validate({
            slug, url
        })
        if(!slug){
            slug = nanoid(5)
        }
        // else {
        //     const existing = await urls.findOne({slug})
        //     if(existing)
        //         throw new Error('Slug in use :P')
        // }
        slug = slug.toLowerCase()
        const newUrl = {
            url,
            slug
        }
        const created = await urls.insert(newUrl)
        res.json(created)
    }
    catch (err) {
        if(err.message.startsWith('E11000'))
            err.message = 'Slug in use :P'
        next(err)
    }
});

app.use((error: any, req: any, res: any, next: any) => {
    if(error.status){
        res.status(error.status)
    }
    else {
        res.status(500)
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? 'cake' : error.stack
    })
})

const port = process.env.PORT || 3333;

app.listen(port, () => {
    console.log('Server is running...')
})