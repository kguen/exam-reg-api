const Mutation = {
    async createStudent(parent, { data }, { prisma }, info) {
        const studentExist = await prisma.exists.Student({ studentID: data.studentID });
        if (studentExist) {
            throw new Error(`Student ${data.studentID} already exist!`);
        } 
        const opArgs = { 
            studentID: data.studentID,
            name: data.name.toLowerCase(), 
            courses: {
                connect: []
            }
        };
        for (let courseID of data.courseIDs) {
            const courseExist = await prisma.exists.Course({ courseID });
            if (courseExist) {
                opArgs.courses.connect.push({ courseID });
            }
        }
        return prisma.mutation.createStudent({ data: opArgs }, info);
    },

    async createSession(parent, { data }, { prisma }, info) {
        const courseExist = await prisma.exists.Course({ courseID: data.courseID });
        if (!courseExist) {
            throw new Error(`Course ${data.courseID} not exist!`);
        }
        const shifts = await prisma.query.shifts({ 
            where: { ...data.shift }
        }, '{ id }');
        if (!shifts.length) {
            throw new Error(`No shift exist at your time of choice!`);
        }
        const roomExist = await prisma.exists.Room({ roomID: data.roomID });
        if (!roomExist) {
            throw new Error(`Room ${data.roomID} not exist!`);
        }
        const sessionExist = await prisma.exists.Session({ 
            shift: data.shift,
            room: { roomID: data.roomID }  
        });
        if (sessionExist) {
            throw new Error('Another session already exist at your time and room of choice!');
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
            if (studentsFromCourse.includes(studentID)) {
                opArgs.data.students.connect.push({ studentID });
            }
        }
        console.log(JSON.stringify(opArgs, null, 2));
        return prisma.mutation.createSession(opArgs, info);
    },

    async createCourse(parent, { data }, { prisma }, info) {
        const courseExist = await prisma.exists.Course({ courseID: data.courseID });
        if (courseExist) {
            throw new Error(`Course ${data.courseID} already exist!`);
        }
        return prisma.mutation.createCourse({ data }, info);
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

    async createRoom(parent, { data }, { prisma }, info) {
        const roomExist = await prisma.exists.Room({ roomID: data.roomID });
        if (roomExist) {
            throw new Error(`Room ${data.roomID} already exist!`);
        }
        return prisma.mutation.createRoom({ data }, info);
    }
};

export { Mutation as default };