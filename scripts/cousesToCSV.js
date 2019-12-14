let res = []
let coursesID = []
let coursesName = []
let tbody = document.getElementsByTagName('tbody')[0].children
for (let i = 0; i < tbody.length; i++) {
    const name = tbody[i].children[1].innerText.replace(/((\(TH\))|(\(LT\))|,)/g, '').trim()
    const courseID = tbody[i].children[4].innerText.replace(/((\(TH\))|(\(LT\))|,)/g, '').trim()
    const subject = {
        name,
        courseID,
    }
    if (!coursesID.includes(courseID) && !coursesName.includes(name)) {
        res.push(subject)
    }
    coursesID.push(courseID)
    coursesName.push(name)
}

function convertToCSV(objArray) {
    let array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray
    let str = ''

    for (let i = 0; i < array.length; i++) {
        let line = ''
        for (let index in array[i]) {
            if (line != '') line += ','
            line += array[i][index]
        }

        str += `${line}\r\n`
    }

    return str
}

function exportCSVFile(headers, items, fileTitle) {
    if (headers) {
        items.unshift(headers)
    }

    // Convert Object to JSON
    let jsonObject = JSON.stringify(items)

    let csv = `\ufeff${convertToCSV(jsonObject)}`
    // console.log(csv)

    let exportedFilenmae = `${fileTitle}.csv` || 'export.csv'

    let blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'})
    if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, exportedFilenmae)
    } else {
        let link = document.createElement('a')
        if (link.download !== undefined) {
            // feature detection
            // Browsers that support HTML5 download attribute
            let url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', exportedFilenmae)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
}

let headers = {
    name: 'name',
    courseID: 'courseID',
}

let fileTitle = 'courses'

exportCSVFile(headers, res, fileTitle)
