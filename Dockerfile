FROM node:12.13-alpine
RUN apk update && apk add bash
ENV NODE_ENV production
EXPOSE 4000
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install  --dev --silent && npm cache clean --force
COPY . .
CMD npm run dev
