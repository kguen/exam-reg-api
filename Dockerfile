FROM node:12.13-alpine as base
RUN apk update && apk add bash
ENV NODE_ENV production
EXPOSE 4000
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install  --dev --silent && npm cache clean --force
RUN npm install -g prisma

FROM base as dev
ENV NODE_ENV development
CMD npm run dev

FROM base as prod
COPY . .
CMD npm start
