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
        if (data.startTime > data.endTime) {
            throw new Error('Shift starting time cannot be greater than shift end time!');
        }
        const shiftsWithinDate = await prisma.query.shifts({
            where: { date: data.date }
        }, '{ startTime endTime }');
        
        for (const shift of shiftsWithinDate) {
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
        
        let studentsFromCourse = await prisma.query.course({
            where: { courseID: data.courseID }
        }, '{ students { studentID } }');
        if (!studentsFromCourse) {
            throw new Error(`Course ${data.courseID} does not exist!`);
        }
        studentsFromCourse = studentsFromCourse.students.map(item => item.studentID);

        const roomData = await prisma.query.room({
            where: { roomID: data.roomID }
        }, '{ totalPC }');
        if (!roomData) {
            throw new Error(`Room ${data.roomID} does not exists!`);
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

    async deleteSession(parent, args, { prisma }, info) {
        const sessions = await prisma.query.sessions({ 
            where: {
                shift: args.where.shift,
                room: { roomID: args.where.roomID }
            }
        }, '{ id }');
        if (!sessions.length) {
            throw new Error(`There's no session that exists at your time and room of choice!`);
        }
        return prisma.mutation.deleteSession({
            where: { id: sessions[0].id }
        }, info);
    },

    deleteRoom(parent, args, { prisma }, info) {
        return prisma.mutation.deleteRoom({
            where: { roomID: args.roomID }
        }, info);
    },

    async deleteShift(parent, { where }, { prisma }, info) {
        const shifts = await prisma.query.shifts({ where }, '{ id }');
        if (!shifts.length) {
            throw new Error(`There's no shift that exists at your time of choice!`);
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
    },

    async updateSession(parent, args, { prisma }, info) {
        let newSession = await prisma.query.sessions({ 
            where: {
                shift: args.where.shift,
                room: { roomID: args.where.roomID }
            } 
        }, '{ id course { courseID } students { studentID } shift { id } room { roomID totalPC } }');
        
        if (!newSession.length) {
            throw new Error(`There's no session that exists at your time and room of choice!`);
        }
        newSession = newSession[0];
        newSession.students = newSession.students.map(item => item.studentID);

        const opArgs = {
            students: { connect: [], disconnect: [] },
            course: { connect: null },
            shift: { connect: null },
            room: { connect: null }
        };
        
        if (args.data.courseID) {
            newSession.course.courseID = args.data.courseID;
            opArgs.course.connect = { courseID: args.data.courseID };
        }
        if (args.data.students) {
            if (args.data.students.connect) {
                for (const studentID of args.data.students.connect) {
                    if (newSession.students.includes(studentID)) {
                        throw new Error(`Student ${studentID} already enrolled in this session!`);
                    }
                    newSession.students.push(studentID);
                }
                opArgs.students.connect = args.data.students.connect.map(item => {
                    return { studentID: item };
                });
            }
            if (args.data.students.disconnect) {
                for (const studentID of args.data.students.disconnect) {
                    if (!newSession.students.includes(studentID)) {
                        throw new Error(`Student ${studentID} not currently enroll in this session!`);
                    }
                    const index = newSession.students.indexOf(studentID);
                    newSession.students.splice(index, 1);
                }
                opArgs.students.disconnect = args.data.students.disconnect.map(item => {
                    return { studentID: item };
                });
            }
        }
        let studentsFromCourse = await prisma.query.course({ 
            where: { courseID: newSession.course.courseID } 
        }, '{ students { studentID } }');
        if (!studentsFromCourse) {
            throw new Error(`Course ${newSession.course.courseID} does not exist!`);
        }
        studentsFromCourse = studentsFromCourse.students.map(item => item.studentID);

        for (const studentID of newSession.students) {
            if (!studentsFromCourse.includes(studentID)) {
                throw new Error(`Student ${studentID} did not enroll in course ${newSession.course.courseID}!`); 
            }
        }
        if (args.data.shift || args.data.room) {
            if (!args.data.roomID && newSession.room.totalPC < newSession.students.length) {
                throw new Error(`Room ${newSession.room.roomID} cannot contain more than ${newSession.room.totalPC} students!`);
            
            } else if (args.data.roomID) {
                const roomData = await prisma.query.room({ 
                    where: { roomID: args.data.roomID } 
                }, '{ totalPC }');
                if (!roomData) {
                    throw new Error(`Room ${args.data.roomID} does not exist!`);
                }
                if (roomData.totalPC < newSession.students.length) {
                    throw new Error(`Room ${args.data.roomID} cannot contain more than ${roomData.totalPC} students!`);
                }
                newSession.room.roomID = args.data.roomID;
                opArgs.room.connect = { roomID: newSession.room.roomID };
            }
            if (args.data.shift) {
                const shifts = await prisma.query.shifts({
                    where: args.data.shift
                }, '{ id }');
                if (!shifts.length) {
                    throw new Error(`There's no shift that existed at your update time of choice!`);
                }
                newSession.shift.id = shifts[0].id;
                opArgs.shift.connect = { id: newSession.shift.id };
            }
            const sessionExist = await prisma.exists.Session({ 
                shift: { id: newSession.shift.id },
                room: { roomID: newSession.room.roomID }
            });
            if (sessionExist) {
                throw new Error('Another session already existed at your time and room of choice!');
            }
        }
        return prisma.mutation.updateSession({
            where: { id: newSession.id },
            data: opArgs
        }, info);
    },

    async updateShift(parent, args, { prisma }, info) {
        let newShift = await prisma.query.shifts({ where: args.where }, '{ id date startTime endTime }');
        if (!newShift) {
            throw new Error(`There's no shift that existed at your time of choice!`);
        }
        newShift = newShift[0];
        if (args.data.date) {
            newShift.date = args.data.date;
        }
        if (args.data.startTime) {
            newShift.startTime = args.data.startTime;
        }
        if (args.data.endTime) {
            newShift.endTime = args.data.endTime;
        }
        if (newShift.startTime > newShift.endTime) {
            throw new Error('Shift starting time cannot be greater than shift end time!');
        }
        const shiftsWithinDate = await prisma.query.shifts({
            where: { date: newShift.date }
        }, '{ startTime endTime }');
        
        for (const shift of shiftsWithinDate) {
            if ((shift.startTime <= newShift.startTime && newShift.startTime < shift.endTime) ||
                (newShift.startTime < shift.startTime && shift.startTime < newShift.endTime)) {
                throw new Error('Another shift already organized at your time of choice!');
            }
        }
        return prisma.mutation.updateShift({
            where: { id: newShift.id },
            data: args.data
        }, info);
    },

    async updateRoom(parent, args, { prisma }, info) {
        if (args.data.totalPC) {
            const sessionsAtRoom = await prisma.query.sessions({
                where: {
                    room: { roomID: args.roomID }
                }
            }, '{ students { id } }');
            for (const item of sessionsAtRoom) {
                if (item.students.length > args.data.totalPC) {
                    throw new Error(`An exam session at room ${args.roomID} with more than ${args.data.totalPC} students exists!`);
                }
            }
        }
        return prisma.mutation.updateRoom({
            where: { roomID: args.roomID },
            data: args.data
        }, info);
    }
};

export { Mutation as default };