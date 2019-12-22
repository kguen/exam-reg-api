import express from 'express'
import multer from 'multer'
import {promisify} from 'util'
import csv from 'csv-parser'
import fs from 'fs'
import prisma from '../prisma'
import {createCourse, createStudent, createRoom, createShift, createSession} from '../resolvers/Mutation'

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
                if (!isSameHeader || fileHeader.length > headers.length) reject(new Error('Invalid file header!'))
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

router.use((req, res, next) => {
    if (!req.user || req.user.userType !== 'ADMIN') {
        return res.send({
            success: false,
            message: "You don't have permission to access this resource, required: ADMIN!",
        })
    }
    next()
})

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

        res.send({success: true, message: 'Import courses successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

router.post('/students', upload.single('students'), async (req, res) => {
    try {
        const filePath = req?.file?.path
        const headers = ['name', 'studentID', 'email', 'courses', 'nonEligibleCourses']

        if (!filePath) {
            res.send({
                success: false,
                message: 'No file found!',
            })
        }

        let students = await parseFile(headers, filePath)

        for (const student of students) {
            student.userInfo = {}
            student.userInfo.name = student.name
            student.userInfo.email = student.email
            student.userInfo.password = student.studentID
            student.courseIDs = student.courses.split(',').map(course => course.trim())
            student.nonEligibleCourseIDs = student.nonEligibleCourses.split(',').map(course => course.trim())
            delete student.name
            delete student.email
            delete student.password
            await createStudent(null, {data: student}, {prisma}, null)
        }

        res.send({success: true, message: 'Import students successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

router.post('/shifts', upload.single('shifts'), async (req, res) => {
    try {
        const filePath = req?.file?.path
        const headers = ['shiftID', 'date', 'startTime', 'endTime']

        if (!filePath) {
            res.send({
                success: false,
                message: 'No file found!',
            })
        }

        const shifts = await parseFile(headers, filePath)

        for (const shift of shifts) {
            await createShift(null, {data: shift}, {prisma}, null)
        }

        res.send({success: true, message: 'Import shifts successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

router.post('/rooms', upload.single('rooms'), async (req, res) => {
    try {
        const filePath = req?.file?.path
        const headers = ['roomID', 'totalPC']

        if (!filePath) {
            res.send({
                success: false,
                message: 'No file found!',
            })
        }

        const rooms = await parseFile(headers, filePath)

        for (const room of rooms) {
            room.totalPC = parseInt(room.totalPC)
            await createRoom(null, {data: room}, {prisma}, null)
        }

        res.send({success: true, message: 'Import rooms successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

router.post('/sessions', upload.single('sessions'), async (req, res) => {
    try {
        const filePath = req?.file?.path
        const headers = ['courseID', 'shiftID', 'roomID', 'students']

        if (!filePath) {
            res.send({
                success: false,
                message: 'No file found!',
            })
        }

        let sessions = await parseFile(headers, filePath)

        for (const session of sessions) {
            session.studentIDs = session.students.split(',').map(student => student.trim())
            delete session.students
            await createSession(null, {data: session}, {prisma}, null)
        }

        res.send({success: true, message: 'Import sessions successfully'})
    } catch (error) {
        res.send({
            success: false,
            message: error.message,
        })
    }
})

export const uploadRouter = router
