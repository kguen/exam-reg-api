import express from 'express'
import multer from 'multer'
import {promisify} from 'util'
import csv from 'csv-parser'
import fs from 'fs'
import prisma from '../prisma'
import {createCourse} from '../resolvers/Mutation'

const upload = multer({dest: 'tmp/csv/'})

const unlinkAsync = promisify(fs.unlink)

const parseFile = async (headers = [], filePath) => {
    const results = []

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(
                csv({
                    mapHeaders: ({header, index}) => `${header.trim()}`,
                })
            )
            .on('headers', fileHeader => {
                const isSameHeader = fileHeader.every(item => {
                    return headers.includes(item)
                })
                if (!isSameHeader) reject(new Error('Invalid file header!'))
            })
            .on('data', data => {
                results.push(data)
            })
            .on('end', async () => {
                await unlinkAsync(filePath)
                resolve(results)
            })
    })
}

const router = express.Router()

router.post('/courses', upload.single('courses'), async (req, res) => {
    try {
        const filePath = req?.file?.path
        const headers = ['name', 'courseID']

        if (!filePath) {
            res.send({
                success: false,
                message: 'No file found!',
            })
        }

        const courses = await parseFile(headers, filePath)

        for (const course of courses) {
            await createCourse(null, {data: course}, {prisma}, null)
        }

        res.send({success: true, message: 'Upload file successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

export const uploadRouter = router
