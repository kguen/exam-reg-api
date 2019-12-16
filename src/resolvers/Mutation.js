import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import {removeAccent, validateTime, formatDate, validateDate} from '../utils'

const Mutation = {
    signIn: async (parent, {data}, {res, prisma}, info) => {
        const {email, password} = data
        const user = await prisma.query.user({where: {email}})
        if (!user) {
            throw new Error(`No such user found for email ${email} found!`)
        }

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            throw new Error('Invalid password!')
        }

        const token = jwt.sign({userID: user.id}, process.env.APP_SECRET)
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })
        return {user, token}
    },
    createStudent: async (parent, {data}, {prisma}, info) => {
        const {password, email, name} = data.userInfo
        const hashed = await bcrypt.hash(password, 10)

        const opArgs = {
            studentID: data.studentID,
            userInfo: {},
            courses: {
                connect: [],
            },
            nonEligibleCourses: {
                connect: [],
            },
        }

        opArgs.userInfo.create = {
            name,
            password: hashed,
            normalizeName: removeAccent(name.toLowerCase()),
            email,
        }

        if (data.courseIDs) {
            for (const courseID of data.courseIDs) {
                opArgs.courses.connect.push({courseID})
            }
        }
        if (data.nonEligibleCourseIDs) {
            for (const courseID of data.nonEligibleCourseIDs) {
                if (!data.courseIDs || !data.courseIDs.includes(courseID)) {
                    throw new Error(`Student ${data.studentID} does not enroll in course ${courseID}!`)
                }
                opArgs.nonEligibleCourses.connect.push({courseID})
            }
        }
        return prisma.mutation.createStudent({data: opArgs}, info)
    },

    createCourse: async (parent, {data}, {prisma}, info) => {

        const opArgs = {
            courseID: data.courseID.toUpperCase(),
            name: data.name,
            normalizeName: removeAccent(data.name.toLowerCase()),
            students: {
                connect: [],
            },
            nonEligibleStudents: {
                connect: [],
            },
        }
        if (data.studentIDs) {
            for (const studentID of data.studentIDs) {
                opArgs.students.connect.push({studentID})
            }
        }
        if (data.nonEligibleStudentIDs) {
            for (let studentID of data.nonEligibleStudentIDs) {
                if (!data.studentIDs || !data.studentIDs.includes(studentID)) {
                    throw new Error(`Student ${studentID} does not enroll in course ${data.courseID}!`)
                }
                opArgs.nonEligibleStudents.connect.push({studentID})
            }
        }
        return prisma.mutation.createCourse({data: opArgs}, info)
    },

    createShift: async (parent, {data}, {prisma}, info) => {
        validateTime(data.startTime, data.endTime)
        validateDate(data.date)

        if (data.startTime > data.endTime) {
            throw new Error('Shift starting time cannot be greater than shift end time!')
        }
        const shiftsWithinDate = await prisma.query.shifts(
            {
                where: {date: data.date},
            },
            '{ startTime endTime }'
        )

        for (const shift of shiftsWithinDate) {
            if (
                (shift.startTime <= data.startTime && data.startTime < shift.endTime) ||
                (data.startTime < shift.startTime && shift.startTime < data.endTime)
            ) {
                throw new Error('Another shift already organized at your time of choice!')
            }
        }
        return prisma.mutation.createShift({data}, info)
    },

    createRoom: async (parent, {data}, {prisma}, info) => {
        return prisma.mutation.createRoom({data}, info)
    },

    createSession: async (parent, {data}, {prisma}, info) => {
        const shiftExists = await prisma.exists.Shift({shiftID: data.shiftID})
        if (!shiftExists) {
            throw new Error(`There's no shift that existed with id ${data.shiftID}`)
        }
        const sessionExists = await prisma.exists.Session({
            shift: {shiftID: data.shiftID},
            room: {roomID: data.roomID},
        })
        if (sessionExists) {
            throw new Error('Another session already existed at your time and room of choice!')
        }

        const opArgs = {
            data: {
                course: {connect: {courseID: data.courseID}},
                room: {connect: {roomID: data.roomID}},
                shift: {connect: {shiftID: data.shiftID}},
                students: {connect: []},
            },
        }

        let thisCourse = await prisma.query.course(
            {
                where: {courseID: data.courseID},
            },
            '{ students { studentID } nonEligibleStudents { studentID } }'
        )
        if (!thisCourse) {
            throw new Error(`Course ${data.courseID} does not exist!`)
        }
        thisCourse.students = thisCourse.students.map(item => item.studentID)
        thisCourse.nonEligibleStudents = thisCourse.nonEligibleStudents.map(item => item.studentID)

        const roomData = await prisma.query.room(
            {
                where: {roomID: data.roomID},
            },
            '{ totalPC }'
        )
        if (!roomData) {
            throw new Error(`Room ${data.roomID} does not exists!`)
        }

        for (const studentID of data.studentIDs) {
            const studentSessionsOnShift = await prisma.query.sessions(
                {
                    where: {
                        students_some: {studentID},
                        shift: {shiftID: data.shiftID},
                    },
                },
                '{ id }'
            )
            const studentSessionsOnCourse = await prisma.query.sessions({
                where: {
                    students_some: {studentID},
                    course: {courseID: data.courseID},
                },
            })
            if (!thisCourse.students.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${data.courseID}!`)
            }
            if (thisCourse.nonEligibleStudents.includes(studentID)) {
                throw new Error(`Student ${studentID} is not eligible for course ${data.courseID}`)
            }
            if (studentSessionsOnShift.length) {
                throw new Error(`Student ${studentID} has another exam session at your time of choice!`)
            }
            if (studentSessionsOnCourse.length) {
                throw new Error(`Student ${studentID} already has another exam session for course ${data.courseID}!`)
            }
            opArgs.data.students.connect.push({studentID})
        }
        if (opArgs.data.students.connect.length > roomData.totalPC) {
            throw new Error(`Room ${data.roomID} cannot contain more than ${roomData.totalPC} students!`)
        }
        return prisma.mutation.createSession(opArgs, info)
    },

    deleteStudent: async (parent, args, {prisma}, info) => {
        return prisma.mutation.deleteStudent(
            {
                where: {studentID: args.studentID},
            },
            info
        )
    },

    deleteCourse: async (parent, args, {prisma}, info) => {
        return prisma.mutation.deleteCourse(
            {
                where: {courseID: args.courseID},
            },
            info
        )
    },

    deleteSession: async (parent, args, {prisma}, info) => {
        return prisma.mutation.deleteSession(
            {
                where: {id: args.id},
            },
            info
        )
    },

    deleteRoom: async (parent, args, {prisma}, info) => {
        return prisma.mutation.deleteRoom(
            {
                where: {roomID: args.roomID},
            },
            info
        )
    },

    deleteShift: async (parent, args, {prisma}, info) => {
        return prisma.mutation.deleteShift(
            {
                where: {shiftID: args.shiftID},
            },
            info
        )
    },

    updateStudent: async (parent, {data, studentID}, {prisma}, info) => {
        const opArgs = {}
        if (data.userInfo) {
            opArgs.userInfo = {update: {}}
            if (data.userInfo.name) {
                opArgs.userInfo.update.name = data.userInfo.name
                opArgs.userInfo.update.normalizeName = removeAccent(data.userInfo.name.toLowerCase())
            }
            if (data.userInfo.email) {
                opArgs.userInfo.update.email = data.userInfo.email
            }
            if (data.userInfo.password) {
                const hashed = await bcrypt.hash(data.userInfo.password, 10)
                opArgs.userInfo.update.password = hashed
            }
        }

        let coursesOfStudent = await prisma.query.student(
            {
                where: {studentID},
            },
            '{ courses { courseID } }'
        )
        coursesOfStudent = coursesOfStudent.courses.map(item => item.courseID)

        if (data.courseIDs) {
            opArgs.courses = {}
            if (data.courseIDs.connect) {
                for (let courseID of data.courseIDs.connect) {
                    if (!coursesOfStudent.includes(courseID)) {
                        coursesOfStudent.push(courseID)
                    }
                }
                opArgs.courses.connect = data.courseIDs.connect.map(courseID => {
                    return {courseID}
                })
            }
            if (data.courseIDs.disconnect) {
                for (let courseID of data.courseIDs.disconnect) {
                    if (coursesOfStudent.includes(courseID)) {
                        const index = coursesOfStudent.indexOf(courseID)
                        coursesOfStudent.splice(index, 1)
                    }
                }
                opArgs.courses.disconnect = data.courseIDs.disconnect.map(courseID => {
                    return {courseID}
                })
            }
        }
        if (data.nonEligibleCourseIDs) {
            opArgs.nonEligibleCourses = {}
            if (data.nonEligibleCourseIDs.connect) {
                for (let courseID of data.nonEligibleCourseIDs.connect) {
                    if (!coursesOfStudent.includes(courseID)) {
                        throw new Error(`Student ${studentID} does not enroll in course ${courseID}!`)
                    }
                }
                opArgs.nonEligibleCourses.connect = data.nonEligibleCourseIDs.connect.map(courseID => {
                    return {courseID}
                })
            }
            if (data.nonEligibleCourseIDs.disconnect) {
                opArgs.nonEligibleCourses.disconnect = data.nonEligibleCourseIDs.disconnect.map(courseID => {
                    return {courseID}
                })
            }
        }
        return prisma.mutation.updateStudent(
            {
                where: {studentID},
                data: opArgs,
            },
            info
        )
    },

    updateCourse: async (parent, args, {prisma}, info) => {
        const opArgs = {}
        if (args.data.name) {
            opArgs.name = args.data.name
            opArgs.normalizeName = removeAccent(args.data.name.toLowerCase())
        }

        let studentsOfCourse = await prisma.query.course(
            {
                where: {courseID: args.courseID},
            },
            '{ students { studentID } }'
        )
        studentsOfCourse = studentsOfCourse.students.map(item => item.studentID)

        if (args.data.studentIDs) {
            opArgs.students = {}
            if (args.data.studentIDs.connect) {
                for (const studentID of args.data.studentIDs.connect) {
                    if (!studentsOfCourse.includes(studentID)) {
                        studentsOfCourse.push(studentID)
                    }
                }
                opArgs.students.connect = args.data.studentIDs.connect.map(studentID => {
                    return {studentID}
                })
            }
            if (args.data.studentIDs.disconnect) {
                for (const studentID of args.data.studentIDs.disconnect) {
                    if (studentsOfCourse.includes(studentID)) {
                        const index = studentsOfCourse.indexOf(studentID)
                        studentsOfCourse.splice(index, 1)
                    }
                }
                opArgs.students.disconnect = args.data.studentIDs.disconnect.map(studentID => {
                    return {studentID}
                })
            }
        }
        if (args.data.nonEligibleStudentIDs) {
            opArgs.nonEligibleStudents = {}
            if (args.data.nonEligibleStudentIDs.connect) {
                for (let studentID of args.data.nonEligibleStudentIDs.connect) {
                    if (!studentsOfCourse.includes(studentID)) {
                        throw new Error(`Student ${studentID} does not enroll in course ${args.courseID}!`)
                    }
                }
                opArgs.nonEligibleStudents.connect = args.data.nonEligibleStudentIDs.connect.map(studentID => {
                    return {studentID}
                })
            }
            if (args.data.nonEligibleStudentIDs.disconnect) {
                opArgs.nonEligibleStudents.disconnect = data.nonEligibleStudentIDs.disconnect.map(studentID => {
                    return {studentID}
                })
            }
        }
        return prisma.mutation.updateCourse(
            {
                where: {courseID: args.courseID},
                data: opArgs,
            },
            info
        )
    },

    updateSession: async (parent, args, {prisma}, info) => {
        let newSession = await prisma.query.session(
            {
                where: {id: args.id},
            },
            '{ course { courseID } students { studentID } shift { shiftID } room { roomID totalPC } }'
        )

        if (!newSession) {
            throw new Error(`There's no session that exists with id ${args.id}!`)
        }
        newSession.students = newSession.students.map(item => item.studentID)

        const opArgs = {
            students: {connect: [], disconnect: []},
            course: {connect: null},
            shift: {connect: null},
            room: {connect: null},
        }

        if (args.data.courseID) {
            newSession.course.courseID = args.data.courseID
            opArgs.course.connect = {courseID: args.data.courseID}
        }
        if (args.data.studentIDs) {
            if (args.data.studentIDs.connect) {
                for (const studentID of args.data.studentIDs.connect) {
                    if (!newSession.students.includes(studentID)) {
                        newSession.students.push(studentID)
                    }
                }
                opArgs.students.connect = args.data.studentIDs.connect.map(studentID => {
                    return {studentID}
                })
            }
            if (args.data.studentIDs.disconnect) {
                for (const studentID of args.data.studentIDs.disconnect) {
                    if (newSession.students.includes(studentID)) {
                        const index = newSession.students.indexOf(studentID)
                        newSession.students.splice(index, 1)
                    }
                }
                opArgs.students.disconnect = args.data.studentIDs.disconnect.map(studentID => {
                    return {studentID}
                })
            }
        }
        let thisCourse = await prisma.query.course(
            {
                where: {courseID: newSession.course.courseID},
            },
            '{ students { studentID } nonEligibleStudents { studentID } }'
        )
        if (!thisCourse) {
            throw new Error(`Course ${newSession.course.courseID} does not exist!`)
        }
        thisCourse.students = thisCourse.students.map(item => item.studentID)
        thisCourse.nonEligibleStudents = thisCourse.nonEligibleStudents.map(item => item.studentID)

        for (const studentID of newSession.students) {
            if (!thisCourse.students.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${newSession.course.courseID}!`)
            }
            if (thisCourse.nonEligibleStudents.includes(studentID)) {
                throw new Error(`Student ${studentID} is not eligible for course ${newSession.course.courseID}!`)
            }
        }
        if (args.data.shiftID || args.data.roomID) {
            if (!args.data.roomID && newSession.room.totalPC < newSession.students.length) {
                throw new Error(
                    `Room ${newSession.room.roomID} cannot contain more than ${newSession.room.totalPC} students!`
                )
            } else if (args.data.roomID) {
                const roomData = await prisma.query.room(
                    {
                        where: {roomID: args.data.roomID},
                    },
                    '{ totalPC }'
                )
                if (!roomData) {
                    throw new Error(`Room ${args.data.roomID} does not exist!`)
                }
                if (roomData.totalPC < newSession.students.length) {
                    throw new Error(`Room ${args.data.roomID} cannot contain more than ${roomData.totalPC} students!`)
                }
                newSession.room.roomID = args.data.roomID
                opArgs.room.connect = {roomID: newSession.room.roomID}
            }
            if (args.data.shiftID) {
                const shiftExists = await prisma.exists.Shift({
                    shiftID: args.data.shiftID,
                })
                if (!shiftExists) {
                    throw new Error(`There's no shift that exists with id ${args.data.shiftID}!`)
                }
                newSession.shift.shiftID = args.data.shiftID
                opArgs.shift.connect = {shiftID: args.data.shiftID}
            }
            const sessionExist = await prisma.exists.Session({
                shift: {shiftID: newSession.shift.shiftID},
                room: {roomID: newSession.room.roomID},
                id_not: args.id,
            })
            if (sessionExist) {
                throw new Error('Another session already existed at your time and room of choice!')
            }
        }
        for (const studentID of newSession.students) {
            const studentSessionsOnShift = await prisma.query.sessions(
                {
                    where: {
                        students_some: {studentID},
                        shift: {shiftID: newSession.shift.shiftID},
                        id_not: args.id
                    },
                },
                '{ id }'
            )
            const studentSessionsOnCourse = await prisma.query.sessions(
                {
                    where: {
                        students_some: {studentID},
                        course: {courseID: newSession.course.courseID},
                        id_not: args.id
                    }
                }, 
                '{ id }'
            )
            console.log(studentSessionsOnShift, studentSessionsOnCourse)
            if (studentSessionsOnShift.length) {
                throw new Error(`Student ${studentID} has another exam session at your time of choice!`)
            }
            if (studentSessionsOnCourse.length) {
                throw new Error(
                    `Student ${studentID} already has another exam session for course ${newSession.course.courseID}!`
                )
            }
        }
        return prisma.mutation.updateSession(
            {
                where: {id: args.id},
                data: opArgs,
            },
            info
        )
    },

    registerToSession: async (parent, args, {prisma}, info) => {
        const session = await prisma.query.session(
            {
                where: {id: args.id},
            },
            '{ course { courseID } students { studentID } shift { shiftID } room { roomID totalPC } }'
        )
        if (!session) {
            throw new Error(`There's no session that exists with id ${args.id}!`)
        }
        if (session.students.some(item => args.studentID === item.studentID)) {
            throw new Error(`Student ${args.studentID} already enrolled in this session!`)
        }
        const course = await prisma.query.course(
            {
                where: {courseID: session.course.courseID},
            },
            '{ students { studentID } }'
        )
        if (!course.students.some(item => args.studentID === item.studentID)) {
            throw new Error(`Student ${args.studentID} did not enroll in course ${session.course.courseID}!`)
        }
        if (session.room.totalPC === session.students.length) {
            throw new Error(`Room ${session.room.roomID} cannot contain more than ${session.room.totalPC} students!`)
        }
        const studentSessionsOnShift = await prisma.query.sessions(
            {
                where: {
                    students_some: {studentID: args.studentID},
                    shift: {shiftID: session.shift.shiftID},
                    id_not: args.id
                },
            },
            '{ id }'
        )
        const studentSessionsOnCourse = await prisma.query.sessions(
            {
                where: {
                    students_some: {studentID: args.studentID},
                    course: {courseID: session.course.courseID},
                    id_not: args.id
                },
            },
            '{ id }'
        )
        if (studentSessionsOnShift.length) {
            throw new Error(`Student ${args.studentID} has another exam session at your time of choice!`)
        }
        if (studentSessionsOnCourse.length) {
            throw new Error(
                `Student ${args.studentID} already has another exam session for course ${session.course.courseID}!`
            )
        }
        return prisma.mutation.updateSession(
            {
                where: {id: args.id},
                data: {
                    students: {
                        connect: [{studentID: args.studentID}],
                    },
                },
            },
            info
        )
    },

    updateShift: async (parent, args, {prisma}, info) => {
        let newShift = await prisma.query.shift(
            {
                where: {shiftID: args.shiftID},
            },
            '{ date startTime endTime }'
        )
        if (!newShift) {
            throw new Error(`There's no shift that exists with id ${args.shiftID}!`)
        }
        if (args.data.date) {
            newShift.date = formatDate(args.data.date)
        }
        if (args.data.startTime) {
            validateTime(args.data.startTime)
            newShift.startTime = args.data.startTime
        }
        if (args.data.endTime) {
            validateTime(args.data.endTime)
            newShift.endTime = args.data.endTime
        }
        if (newShift.startTime > newShift.endTime) {
            throw new Error('Shift starting time cannot be greater than shift end time!')
        }
        const shiftsWithinDate = await prisma.query.shifts(
            {
                where: {
                    date: newShift.date,
                    shiftID_not: args.shiftID,
                },
            },
            '{ startTime endTime }'
        )

        for (const shift of shiftsWithinDate) {
            if (
                (shift.startTime <= newShift.startTime && newShift.startTime < shift.endTime) ||
                (newShift.startTime < shift.startTime && shift.startTime < newShift.endTime)
            ) {
                throw new Error('Another shift already organized at your time of choice!')
            }
        }
        return prisma.mutation.updateShift(
            {
                where: {shiftID: args.shiftID},
                data: args.data,
            },
            info
        )
    },

    updateRoom: async (parent, args, {prisma}, info) => {
        if (args.data.totalPC) {
            const sessionsAtRoom = await prisma.query.sessions(
                {
                    where: {
                        room: {roomID: args.roomID},
                    },
                },
                '{ students { id } }'
            )
            for (const item of sessionsAtRoom) {
                if (item.students.length > args.data.totalPC) {
                    throw new Error(
                        `An exam session at room ${args.roomID} with more than ${args.data.totalPC} students exists!`
                    )
                }
            }
        }
        return prisma.mutation.updateRoom(
            {
                where: {roomID: args.roomID},
                data: args.data,
            },
            info
        )
    },
}

export {Mutation as default}

export const {createCourse, createRoom, createStudent, createShift} = Mutation
