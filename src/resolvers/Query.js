const Query = {
    students(parent, { query }, { prisma }, info) {
        const opArgs = {};
        if (query) {
            opArgs.where = {
                OR: [
                    { studentID_contains: query },
                    { name_contains: query.toLowerCase() }
                ]
            };
        }
        return prisma.query.students(opArgs, info);
    },
    courses(parent, { query }, { prisma }, info) {
        const opArgs = {};
        if (query) {
            opArgs.where = {
                OR: [
                    { courseID_contains: query },
                    { name_contains: query.toLowerCase() }
                ]
            };
        }
        return prisma.query.courses(opArgs, info);
    },
    sessions(parent, { query }, { prisma }, info) {
        const opArgs = { where: {} };
        if (query) {
            if (query.roomID) {
                opArgs.where.room = { roomID: query.roomID };
            }
            if (query.courseID) {
                opArgs.where.course = { courseID: query.courseID };
            }
            if (query.studentID) {
                opArgs.where.students_some = { studentID: query.studentID };
            }
            if (query.shift) {
                opArgs.where.shift = query.shift;
            }
        }
        return prisma.query.sessions(opArgs, info);
    },
    shifts(parent, args, { prisma }, info) {
        return prisma.query.shifts(null, info);
    },
    rooms(parent, args, { prisma }, info) {
        return prisma.query.rooms(null, info);
    }
};

export { Query as default };