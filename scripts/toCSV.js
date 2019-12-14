const {ExportToCsv} = require('export-to-csv')

let data = [
    {
        name: 'Đỗ Mạnh Hùng',
        studentID: '17020783',
        email: '17020783@vnu.edu.vn',
        courses: 'EET3027 1, CTE3009 1, INT3307 1, EET3023 1, EET3001 1, INT3121 1',
    },
    {
        name: 'Nguyễn Anh Khoa',
        studentID: '17020009',
        email: '17020009@vnu.edu.vn',
        courses: 'INT3506 1, EMA3021 1, EPN2001 1, AGT 2002 1, INT3313 1, INT2203 1',
    },
    {
        name: 'Nguyễn Thị Xuân Dung',
        studentID: '17020638',
        email: '17020638@vnu.edu.vn',
        courses: 'INT3402 1, INT3414 1, ELT2028 1, PHY1100 20, EMA2037 1, CTE2001 1',
    },
    {
        name: 'Nguyễn Văn A',
        studentID: '17021234',
        email: '17021234@vnu.edu.vn',
        courses: 'EMA3014 1, EMA3015 1, CTE2004 1, INT3201 1',
        nonEligibleStudents: 'EET3027 1, CTE3009 1, INT3307 1, EET3023 1, EET3001 1, INT3121 1',
    },
]

const options = {
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalSeparator: '.',
    showLabels: true,
    // showTitle: true,
    title: 'students',
    useTextFile: false,
    useBom: true,
    headers: ['name', 'studentID', 'email', 'courses'],
    // useKeysAsHeaders: true,
    // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
}

const csvExporter = new ExportToCsv(options)

const fs = require('fs')

const csvData = csvExporter.generateCsv(data, true)
fs.writeFileSync('data.csv', csvData)
