const {ExportToCsv} = require('export-to-csv')

let students = [
    {
        name: 'Đỗ Mạnh Hùng',
        studentID: '17020783',
        email: '17020783@vnu.edu.vn',
        courses: 'EET3027 1, CTE3009 1, INT3307 1, EET3023 1, EET3001 1, INT3121 1, INT3506 1, EMA3021 1, INT2203 1',
        nonEligibleCourses: 'INT3506 1, EMA3021 1, INT2203 1',
    },
    {
        name: 'Nguyễn Anh Khoa',
        studentID: '17020009',
        email: '17020009@vnu.edu.vn',
        courses: 'INT3506 1, EMA3021 1, EPN2001 1, AGT 2002 1, INT3313 1, INT2203 1, EET3001 1, CTE2001 1, INT3414 1',
        nonEligibleCourses: 'EET3001 1, CTE2001 1, INT3414 1',
    },
    {
        name: 'Nguyễn Thị Xuân Dung',
        studentID: '17020638',
        email: '17020638@vnu.edu.vn',
        courses: 'INT3402 1, INT3414 1, ELT2028 1, PHY1100 20, EMA2037 1, CTE2001 1, INT3506 1, EMA3021 1, EPN2001 1',
        nonEligibleCourses: 'INT3506 1, EMA3021 1, EPN2001 1',
    },
    {
        name: 'Nguyễn Văn A',
        studentID: '17021234',
        email: '17021234@vnu.edu.vn',
        courses:
            'EMA3014 1, EMA3015 1, CTE2004 1, INT3201 1, EET3027 1, CTE3009 1, INT3307 1, EET3023 1, EET3001 1, INT3121 1',
        nonEligibleCourses: 'EET3027 1, CTE3009 1, INT3307 1, EET3023 1, EET3001 1, INT3121 1',
    },
]

let shifts = [
    {
        date: '24/12/2019',
        startTime: '07:00',
        endTime: '08:00',
    },
    {
        date: '24/12/2019',
        startTime: '08:00',
        endTime: '09:00',
    },
    {
        date: '24/12/2019',
        startTime: '13:00',
        endTime: '14:00',
    },
    {
        date: '25/12/2019',
        startTime: '10:00',
        endTime: '11:00',
    },
    {
        date: '26/12/2019',
        startTime: '17:00',
        endTime: '18:00',
    },
    {
        date: '27/12/2019',
        startTime: '18:00',
        endTime: '19:00',
    },
    {
        date: '28/12/2019',
        startTime: '11:00',
        endTime: '12:00',
    },
    {
        date: '01/01/2020',
        startTime: '12:00',
        endTime: '13:00',
    },
    {
        date: '02/01/2020',
        startTime: '13:00',
        endTime: '14:00',
    },
    {
        date: '03/01/2020',
        startTime: '14:00',
        endTime: '15:00',
    },
    {
        date: '04/01/2020',
        startTime: '08:00',
        endTime: '09:00',
    },
    {
        date: '05/01/2020',
        startTime: '08:00',
        endTime: '09:00',
    },
    {
        date: '06/01/2020',
        startTime: '13:00',
        endTime: '15:00',
    },
    {
        date: '07/01/2020',
        startTime: '07:00',
        endTime: '09:00',
    },
    {
        date: '08/01/2020',
        startTime: '08:00',
        endTime: '09:00',
    },
    {
        date: '09/01/2020',
        startTime: '14:00',
        endTime: '06:00',
    },
    {
        date: '10/01/2020',
        startTime: '06:00',
        endTime: '07:00',
    },
]

let rooms = [
    {
        roomID: '01',
        totalPC: 20,
    },
    {
        roomID: '02',
        totalPC: 30,
    },
    {
        roomID: '03',
        totalPC: 40,
    },
    {
        roomID: '04',
        totalPC: 40,
    },
    {
        roomID: '05',
        totalPC: 50,
    },
    {
        roomID: '06',
        totalPC: 60,
    },
    {
        roomID: '07',
        totalPC: 70,
    },
    {
        roomID: '08',
        totalPC: 80,
    },
    {
        roomID: '09',
        totalPC: 90,
    },
    {
        roomID: '10',
        totalPC: 100,
    },
    {
        roomID: '11',
        totalPC: 110,
    },
    {
        roomID: '12',
        totalPC: 12,
    },
    {
        roomID: '13',
        totalPC: 13,
    },
    {
        roomID: '14',
        totalPC: 14,
    },
    {
        roomID: '15',
        totalPC: 15,
    },
    {
        roomID: '16',
        totalPC: 16,
    },
    {
        roomID: '17',
        totalPC: 17,
    },
    {
        roomID: '18',
        totalPC: 18,
    },
    {
        roomID: '19',
        totalPC: 19,
    },
    {
        roomID: '20',
        totalPC: 20,
    },
    {
        roomID: '21',
        totalPC: 21,
    },
    {
        roomID: '22',
        totalPC: 22,
    },
    {
        roomID: '23',
        totalPC: 23,
    },
    {
        roomID: '24',
        totalPC: 24,
    },
    {
        roomID: '25',
        totalPC: 25,
    },
    {
        roomID: '26',
        totalPC: 26,
    },
    {
        roomID: '27',
        totalPC: 27,
    },
    {
        roomID: '28',
        totalPC: 28,
    },
    {
        roomID: '29',
        totalPC: 29,
    },
    {
        roomID: '30',
        totalPC: 30,
    },
]

const studentHeader = ['name', 'studentID', 'email', 'courses', 'nonEligibleCourses']

const roomHeader = ['roomID', 'totalPC']

const shiftHeader = ['date', 'startTime', 'endTime']

const options = {
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true,
    // showTitle: true,
    title: 'students',
    useTextFile: false,
    useBom: true,
    headers: studentHeader,
    // useKeysAsHeaders: true,
    // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
}

const csvExporter = new ExportToCsv(options)

const fs = require('fs')

const csvData = csvExporter.generateCsv(students, true)
fs.writeFileSync('students.csv', csvData)
