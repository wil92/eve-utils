# Documentation

This is a dev documentation about the current application. You can find here important information that can help with the understanding of the code.

## Read anomalies from clipboard

Information related to the code used for interpreting the list of anomalies copied from EVE online.

**Relevant classes:**

- TBD

### Example text

```
FOM-167	Cosmic Signature			0.0%	8.12 AU
GCJ-920	Cosmic Anomaly	Combat Site	Perimeter Checkpoint	100.0%	5.26 AU
JCY-551	Cosmic Signature	Wormhole	Unstable Wormhole	100.0%	7.60 AU
SED-954	Cosmic Signature	Data Site	Unsecured Perimeter Transponder Farm 	100.0%	6.74 AU
HBE-668	Cosmic Signature	Gas Site		50.5%	28.62 AU
MLO-018	Cosmic Signature			0.0%	41.73 AU
```

> Note: the spaces between the information is with \t

### Syntactical Analysis

```
// Tokens
id-token
string-token
percent-token
distance-token
endl-token
```

### Lexical Analysis

```
<id-token> = /^[A-Z]{3}-[0-9]{3}$/
<anomaly-type> = "Combat Site" | "Wormhole" | "Data Site" | "Relic Site" | "Gas Site" | "Ore Site"
<anomaly-category> = "Cosmic Anomaly" | "Cosmic Signature"
<anomaly-name> = <string-token>
<line1> = <id-token> <anomaly-category> <anomaly-type> <anomaly-name> <percent-token> <distance-token>
<line2> = <id-token> <anomaly-category> <anomaly-type> <percent-token> <distance-token>
<line3> = <id-token> <anomaly-category> <percent-token> <distance-token>

<line> = <line1> | <line2> | <line3>
```

## Update database script

This is a script that take the information out of the latest version of EVE online databases and update the database use in the application.

### Steps to update the database (dev perspective)

The developer needs to start the *setup.js* script. This script generate automatically the new DB version, base on the latest CCP DB provided.

### Application automatic DB update (behavior)

When the application found a new db version available, it should notify the user about it.
How the version change:

- If the version change the minor number, it means that you can get this new db without braking changes.
- If the version change a major number, it means that you need the new application version.

The application always ask the user if he/her want to update the DB.
