import {removeAccent} from '../utils'

const Query = {
    me(parent, args, {req, user, prisma}, info) {
        // TODO change this
        if (!user) {
            return null
        }
        return user
    },
    students(parent, {query}, {prisma}, info) {
        // TODO query by name
        const opArgs = {}
        if (query) {
            opArgs.where = {
                // OR: [{studentID_contains: query}, {name_contains: query.toLowerCase()}],
                studentID_contains: query,
            }
        }
        return prisma.query.students(opArgs, info)
    },
    courses: async (parent, {query}, {prisma}, info) => {
        const opArgs = {}
        if (query) {
            opArgs.where = {
                OR: [
                    {courseID_contains: removeAccent(query.toUpperCase())},
                    {normalizeName_contains: removeAccent(query.toLowerCase())},
                ],
            }
        }
        return prisma.query.courses(opArgs, info)
    },
    sessions: async (parent, {query}, {prisma}, info) => {
        const opArgs = {where: {}}
        if (query) {
            if (query.roomID) {
                opArgs.where.room = {roomID: query.roomID}
            }
            if (query.courseID) {
                opArgs.where.course = {courseID: query.courseID}
            }
            if (query.studentID) {
                opArgs.where.students_some = {studentID: query.studentID}
            }
            if (query.shift) {
                opArgs.where.shift = query.shift
            }
        }
        return prisma.query.sessions(opArgs, info)
    },
    shifts: async (parent, args, {prisma}, info) => {
        return prisma.query.shifts(null, info)
    },
    rooms: async (parent, args, {prisma}, info) => {
        return prisma.query.rooms(null, info)
    },
}

export {Query as default}
