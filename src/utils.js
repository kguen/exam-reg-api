import moment from 'moment'

const hourFormat = 'HH:mm'
const defaultDateFormat = 'DD/MM/YYYY'

const removeAccent = str => {
    str = str.replace(
        /\u00E0|\u00E1|\u1EA1|\u1EA3|\u00E3|\u00E2|\u1EA7|\u1EA5|\u1EAD|\u1EA9|\u1EAB|\u0103|\u1EB1|\u1EAF|\u1EB7|\u1EB3|\u1EB5/g,
        'a'
    )
    str = str.replace(/\u00E8|\u00E9|\u1EB9|\u1EBB|\u1EBD|\u00EA|\u1EC1|\u1EBF|\u1EC7|\u1EC3|\u1EC5/g, 'e')
    str = str.replace(/\u00EC|\u00ED|\u1ECB|\u1EC9|\u0129/g, 'i')
    str = str.replace(
        /\u00F2|\u00F3|\u1ECD|\u1ECF|\u00F5|\u00F4|\u1ED3|\u1ED1|\u1ED9|\u1ED5|\u1ED7|\u01A1|\u1EDD|\u1EDB|\u1EE3|\u1EDF|\u1EE1/g,
        'o'
    )
    str = str.replace(/\u00F9|\u00FA|\u1EE5|\u1EE7|\u0169|\u01B0|\u1EEB|\u1EE9|\u1EF1|\u1EED|\u1EEF/g, 'u')
    str = str.replace(/\u1EF3|\u00FD|\u1EF5|\u1EF7|\u1EF9/g, 'y')
    str = str.replace(/\u0111/g, 'd')
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '')
    str = str.replace(/\u02C6|\u0306|\u031B/g, '')
    return str
}

const validateTime = (...timeArr) => {
    timeArr.forEach(time => {
        if (!moment(time, hourFormat).isValid()) {
            throw new Error(`Invalid time format: ${time}!`)
        }
    })
}

const validateDate = (...dateArr) => {
    dateArr.forEach(date => {
        if (!moment(date, defaultDateFormat).isValid()) {
            throw new Error(`Invalid date format: ${date}!`)
        }
    })
}

const formatDate = (date, format = defaultDateFormat) => {
    return moment(date).format(format)
}

export {removeAccent, validateTime, validateDate, formatDate}
