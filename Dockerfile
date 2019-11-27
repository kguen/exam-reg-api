FROM node:12.13.1-alpine3.10 as base
RUN apk update && apk add bash
ENV NODE_ENV development
EXPOSE 4000
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --only=dev && npm cache clean --force

FROM base as dev
ENV NODE_ENV development
CMD npm run dev

FROM base as prod
ENV NODE_ENV production
COPY . .
CMD npm start
