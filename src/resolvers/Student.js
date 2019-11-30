const Student = {
    courses: {
        fragment: 'fragment userId on Student { userInfo { id } }',
        resolve(parent, args, {user}, info) {
            if (!user || (user.userType !== 'ADMIN' && user.id !== parent.userInfo.id )) {
                return null
            }
            return parent.courses
        }
    }
}

export { Student as default }