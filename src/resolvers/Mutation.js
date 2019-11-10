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
        const roomData = await prisma.query.room({
            where: { roomID: data.roomID }
        }, '{ totalPC }');

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
        if (opArgs.data.students.connect.length > roomData.totalPC) {
            throw new Error(`Room ${data.roomID} cannot contain more than ${roomData.totalPC} students!`);
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

    async deleteShift(parent, { where }, { prisma }, info) {
        const shifts = await prisma.query.shifts({ where }, '{ id }');
        if (shifts.length === 0) {
            throw new Error('Shift not exist!');
        }
        return prisma.mutation.deleteShift({
            where: { id: shifts[0].id }
        }, info);
    },
    
    updateStudent(parent, args, { prisma }, info) {
        if (args.data.name) {
            args.data.name = args.data.name.toLowerCase();
        }
        if (args.data.courses) {
            if (args.data.courses.connect) {
                let prismaConnect = [];
                for (const courseID of args.data.courses.connect) {
                    prismaConnect.push({ courseID });
                }
                args.data.courses.connect = prismaConnect;
            }
            if (args.data.courses.disconnect) {
                let prismaDisconnect = [];
                for (const courseID of args.data.courses.disconnect) {
                    prismaDisconnect.push({ courseID });
                }
                args.data.courses.disconnect = prismaDisconnect;
            }
        }
        return prisma.mutation.updateStudent({
            where: { studentID: args.studentID },
            data: args.data
        }, info);
    },

    updateCourse(parent, args, { prisma }, info) {
        if (args.data.name) {
            args.data.name = args.data.name.toLowerCase();
        }
        if (args.data.students) {
            if (args.data.students.connect) {
                let prismaConnect = [];
                for (const studentID of args.data.students.connect) {
                    prismaConnect.push({ studentID });
                }
                args.data.students.connect = prismaConnect;
            }
            if (args.data.students.disconnect) {
                let prismaDisconnect = [];
                for (const studentID of args.data.students.disconnect) {
                    prismaDisconnect.push({ studentID });
                }
                args.data.students.disconnect = prismaDisconnect;
            }
        }
        return prisma.mutation.updateCourse({
            where: { courseID: args.courseID },
            data: args.data
        }, info);
    }
};

export { Mutation as default };