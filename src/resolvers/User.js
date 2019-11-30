const User = {
    email: {
        fragment: 'fragment userId on User { id }',
        resolve(parent, args, {user}, info) {
            if (!user || (user.userType !== 'ADMIN' && user.id !== parent.id)) {
                return null
            }
            return parent.email
        }
    }
}

export { User as default }