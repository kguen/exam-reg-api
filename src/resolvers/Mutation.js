import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { removeAccent, validateTime, formatDate, validateDate} from '../utils'

const Mutation = {
    signIn: async (parent, {data}, {res, prisma}, info) => {
        // TODO using bcrypt
        const {email, password} = data
        const user = await prisma.query.user({where: {email}})

        if (!user) {
            throw new Error(`No such user found for email ${email}`)
        }

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            throw new Error('Invalid Password!')
        }

        const token = jwt.sign({userID: user.id}, process.env.APP_SECRET)

        user.token = token

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365,
        })

        // console.log(user)
        return user
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
        }

        opArgs.userInfo.create = {
            name,
            password: hashed,
            normalizeName: removeAccent(name.toLowerCase()),
            email,
        }

        if (data.courseIDs) {
            for (let courseID of data.courseIDs) {
                opArgs.courses.connect.push({courseID})
            }
        }
        return prisma.mutation.createStudent({data: opArgs}, info)
    },

    createCourse: async (parent, {data}, {prisma}, info) => {
        const opArgs = {
            courseID: data.courseID,
            name: data.name,
            normalizeName: removeAccent(data.name.toLowerCase()),
            students: {
                connect: [],
            },
        }
        if (data.studentIDs) {
            for (const studentID of data.studentIDs) {
                opArgs.students.connect.push({studentID})
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
        const shiftExists = await prisma.exists.Shift({id: data.shiftID})
        if (!shiftExists) {
            throw new Error(`There's no shift that existed with id ${data.shiftID}`)
        }
        const sessionExists = await prisma.exists.Session({
            shift: {id: data.shiftID},
            room: {roomID: data.roomID},
        })
        if (sessionExists) {
            throw new Error('Another session already existed at your time and room of choice!')
        }

        const opArgs = {
            data: {
                course: {connect: {courseID: data.courseID}},
                room: {connect: {roomID: data.roomID}},
                shift: {connect: {id: data.shiftID}},
                students: {connect: []},
            },
        }

        let studentsFromCourse = await prisma.query.course(
            {
                where: {courseID: data.courseID},
            },
            '{ students { studentID } }'
        )
        if (!studentsFromCourse) {
            throw new Error(`Course ${data.courseID} does not exist!`)
        }
        studentsFromCourse = studentsFromCourse.students.map(item => item.studentID)

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
                        shift: data.shift,
                    },
                },
                '{ id }'
            )
            if (!studentsFromCourse.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${data.courseID}!`)
            } else if (studentSessionsOnShift.length) {
                throw new Error(`Student ${studentID} has another exam session at your time of choice!`)
            } else {
                opArgs.data.students.connect.push({studentID})
            }
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
                where: {id: args.id},
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
        if (data.courseIDs) {
            opArgs.courses = {}
            if (data.courseIDs.connect) {
                opArgs.courses.connect = data.courseIDs.connect.map(courseID => {
                    return {courseID}
                })
            }
            if (data.courseIDs.disconnect) {
                opArgs.courses.disconnect = data.courseIDs.disconnect.map(courseID => {
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
        if (args.data.studentIDs) {
            opArgs.students = {}
            if (args.data.studentIDs.connect) {
                opArgs.students.connect = args.data.studentIDs.connect.map(studentID => {
                    return {studentID}
                })
            }
            if (args.data.studentIDs.disconnect) {
                opArgs.students.disconnect = args.data.studentIDs.disconnect.map(studentID => {
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
            '{ course { courseID } students { studentID } shift { id } room { roomID totalPC } }'
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
                    if (!newSession.students.includes(studentID)) {
                        throw new Error(`Student ${studentID} not currently enroll in this session!`)
                    }
                    const index = newSession.students.indexOf(studentID)
                    newSession.students.splice(index, 1)
                }
                opArgs.students.disconnect = args.data.studentIDs.disconnect.map(studentID => {
                    return {studentID}
                })
            }
        }
        let studentsFromCourse = await prisma.query.course(
            {
                where: {courseID: newSession.course.courseID},
            },
            '{ students { studentID } }'
        )
        if (!studentsFromCourse) {
            throw new Error(`Course ${newSession.course.courseID} does not exist!`)
        }
        studentsFromCourse = studentsFromCourse.students.map(item => item.studentID)

        for (const studentID of newSession.students) {
            if (!studentsFromCourse.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${newSession.course.courseID}!`)
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
                    id: args.data.shiftID,
                })
                if (!shiftExists) {
                    throw new Error(`There's no shift that exists with id ${args.data.shiftID}!`)
                }
                newSession.shift.id = args.data.shiftID
                opArgs.shift.connect = {id: args.data.shiftID}
            }
            const sessionExist = await prisma.exists.Session({
                shift: {id: newSession.shift.id},
                room: {roomID: newSession.room.roomID},
                id_not: args.id,
            })
            if (sessionExist) {
                throw new Error('Another session already existed at your time and room of choice!')
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

    updateShift: async (parent, args, {prisma}, info) => {
        let newShift = await prisma.query.shift(
            {
                where: {id: args.id},
            },
            '{ date startTime endTime }'
        )
        if (!newShift) {
            throw new Error(`There's no shift that exists with id ${args.id}!`)
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
                    id_not: args.id,
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
                where: {id: args.id},
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
