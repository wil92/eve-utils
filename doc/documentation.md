# Documentation

## Read anomalies from clipboard

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
