# Build the project
FROM node:24 AS builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
# builds vite stuff
RUN npm run build 

# Serve the dev server
EXPOSE 8080
CMD ["sh", "-c", "npm run dev"]


# docker build -t onekeyjam .
# docker run -p 8080:8080 onekeyjam
# This will make your application accessible on localhost:8080.
#
# Remaining problems:
# - vue app has various MIME errors
# - cannot access http://localhost:8080/ from outside the container?
