#!/bin/bash

if [ -f .env ]
then
  export $(cat .env | xargs)
fi

node server.js
