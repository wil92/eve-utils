#!/bin/bash

if [[ $(git diff --name-only HEAD HEAD~1) == *"server.js"* ]];
then
  echo "::set-output name=exist::true";
else
  echo "::set-output name=exist::false";
fi;
