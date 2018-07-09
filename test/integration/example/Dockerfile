FROM ubuntu:latest

# Install git
RUN apt-get update
RUN apt-get -y install git

# Install Node
RUN apt-get -y install curl
RUN apt-get -y install gnupg
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash
RUN apt-get -y install nodejs

# Copy the package.json into the container so that we can
# run the install. Most other files will be linked, rather
# than copied to allow for changes without rebuilds
WORKDIR /usr/repo
COPY package.json /usr/repo

# Create file which will be executed by jest
# to assert that the CLI and diff output is what we expect
RUN echo "const expectedCLIOutput = require('../linked/expected-cli-output.json');\n" \
    "const actualCLIOutput = require('./cli-output.json');\n" \
    "const expectedDiffOutput = require('fs').readFileSync('../linked/expected-diff-output.txt', 'utf8');\n" \
    "const actualDiffOutput = require('fs').readFileSync('./diff-output.txt', 'utf8');\n" \
    "\n" \
    "test('it should produce the expected CLI output', () => {\n" \
    "  expect(actualCLIOutput).toEqual(expectedCLIOutput);\n" \
    "});\n" \
    "test('it should produce the expected diff output', () => {\n" \
    "  expect(actualDiffOutput).toEqual(expectedDiffOutput);\n" \
    "});\n"> test.js

# Create .gitignore file
RUN echo "node_modules\n" \
    "\n" > .gitignore

# Install dependencies
RUN npm install

# Initialize git
RUN git init

# Copy the initial state of the repo
ARG CACHE_DATE
COPY test-source-initial /usr/repo/test-source

# Commit the initial state
RUN git config --global user.email "you@example.com"
RUN git config --global user.name "Your Name"
RUN git add --all
RUN git commit -m "Initial commit"

# Apply the staged state to the repo
COPY test-source-staged /usr/repo/test-source
RUN git add --all

# Run the start script specified in the package.json
CMD [ "npm", "start" ]
