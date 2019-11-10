const Mutation = {
    createStudent(parent, { data }, { prisma }, info) {
        const opArgs = { 
            studentID: data.studentID,
            name: data.name.toLowerCase(), 
            courses: {
                connect: []
            }
        };
        if (data.courseIDs) {
            for (let courseID of data.courseIDs) {
                opArgs.courses.connect.push({ courseID });
            }
        }
        return prisma.mutation.createStudent({ data: opArgs }, info);
    },

    createCourse(parent, { data }, { prisma }, info) {
        const opArgs = { 
            courseID: data.courseID,
            name: data.name.toLowerCase(), 
            students: {
                connect: []
            }
        };
        if (data.studentIDs) {
            for (let studentID of data.studentIDs) {
                opArgs.students.connect.push({ studentID });
            }
        }
        return prisma.mutation.createCourse({ data: opArgs }, info);
    },

    async createShift(parent, { data }, { prisma }, info) {
        const shiftsWithinDate = await prisma.query.shifts({
            where: { date: data.date }
        }, '{ startTime endTime }');
        
        for (let shift of shiftsWithinDate) {
            if ((shift.startTime <= data.startTime && data.startTime < shift.endTime) ||
                (data.startTime < shift.startTime && shift.startTime < data.endTime)) {
                throw new Error('Another shift already organized at your time of choice!');
            }
        }
        return prisma.mutation.createShift({ data }, info);
    },

    createRoom(parent, { data }, { prisma }, info) {
        return prisma.mutation.createRoom({ data }, info);
    },

    async createSession(parent, { data }, { prisma }, info) {
        const shifts = await prisma.query.shifts({ 
            where: { ...data.shift }
        }, '{ id }');
        if (!shifts.length) {
            throw new Error(`There's no shift that existed at your time of choice!`);
        }
        const sessionExist = await prisma.exists.Session({ 
            shift: data.shift,
            room: { roomID: data.roomID }  
        });
        if (sessionExist) {
            throw new Error('Another session already existed at your time and room of choice!');
        }

        const opArgs = {
            data: {
                course: { connect: { courseID: data.courseID } },
                room: { connect: { roomID: data.roomID } },
                shift: { connect: { id: shifts[0].id } },
                students: { connect: [] }
            }
        };
        
        const courseData = await prisma.query.course({
            where: { courseID: data.courseID }
        }, '{ students { studentID } }');

        let studentsFromCourse = [];
        for (const data of courseData.students) {
            studentsFromCourse.push(data.studentID);
        }
        for (const studentID of data.studentIDs) {
            const studentSessionsOnShift = await prisma.query.sessions({
                where: {
                    students_some: { studentID },
                    shift: data.shift
                }
            }, '{ id }');
            if (!studentsFromCourse.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${data.courseID}!`); 
            } else if (studentSessionsOnShift.length) {
                throw new Error(`Student ${studentID} has another exam session at your time of choice!`);
            } else {
                opArgs.data.students.connect.push({ studentID });
            }
        }
        return prisma.mutation.createSession(opArgs, info);
    },

    deleteStudent(parent, args, { prisma }, info) {
        return prisma.mutation.deleteStudent({
            where: { studentID: args.studentID }
        }, info);
    },

    deleteCourse(parent, args, { prisma }, info) {
        return prisma.mutation.deleteCourse({
            where: { courseID: args.courseID }
        }, info);
    },

    deleteRoom(parent, args, { prisma }, info) {
        return prisma.mutation.deleteRoom({
            where: { roomID: args.roomID }
        }, info);
    },

    deleteShift(parent, { where }, { prisma }, info) {
        const shifts = prisma.query.shifts({ where }, '{ id }');
        console.log(shifts);
        return prisma.mutation.deleteShift({
            where: { id: shifts[0].id }
        }, info);
    }
};

export { Mutation as default };