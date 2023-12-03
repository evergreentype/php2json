# PHP2JSON

Supports unserializing PHP `serialize` data into a JS object that can be parsed into JSON for further processing.

Does not require custom JS Classes for unserializing data.

Can be imported into JS as a ESM module or used a CLI command.

## Installation

```
npm install php2json
```

## Usage with JS

Use with JS:

```js
import { unserializePHP } from 'php2json'

const data = unserializePHP('O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123}')
console.log(data) // { "_type": "MyClass", "foo": "bar", "baz": 123 }
```

It is recommended to encode serialized data into base64 before porting it to other environments.

1. In PHP, encode into base64:

```php
serialized($myObj); // 'O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}'
base64_encode(serialized($myObj)); // 'Tzo3OiJNeUNsYXNzIjoyOntzOjM6ImZvbyI7czozOiJiYXIiO3M6MzoiYmF6IjtpOjEyMzt9='
```

2. Use the `decode` flag to decode the string from base64 before deserialization:

```js
import { unserializePHP } from 'php2json'

const data = unserializePHP('Tzo3OiJNeUNsYXNzIjoyOntzOjM6ImZvbyI7czozOiJiYXIiO3M6MzoiYmF6IjtpOjEyMzt9=', { decode: 'base64' })
console.log(data) // { "_type": "MyClass", "foo": "bar", "baz": 123 }
```

## Usage as a CLI Command

Install globally:

```
npm install -g php2json
```

Use as a regular CLI command by passing stdin:

```bash
> echo 'O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}' | php2json
{"_type":"MyClass","foo":"bar","baz":123}
> php2json --help
Supports unserializing PHP data into a JS object that can be parsed into JSON for further processing.

Flags:
    --decode=base64 - Decode Base64 string into UTF-8 before processing.
```

This allows for nice data processing with [nushell](https://www.nushell.sh). E.g. read serialized string → convert to JSON → convert to structured data → interactively explore the result:

```
nu> 'O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}' | php2json | from json | explore
```

## Grammar

The grammar was taken from [Parsing serialized PHP data with BNF using Instaparse - Stack Overflow](https://stackoverflow.com/q/18518499/5856760).

```
<S> = expr
<expr> = (string | integer | double | boolean | null | array | object | reference | enum)+
<digit> = #'[0-9]'
<number> = negative* (decimal-num | integer-num)
<negative> = '-'
<integer-num> = digit+
<decimal-num> = integer-num '.' integer-num
<zero-or-one> = '0'|'1'
size = refIndex = digit+
key = (string | integer)
<val> = expr
array = <'a:'> <size> <':{'> (key val)+ <'}'> <';'>?
boolean = <'b:'> zero-or-one <';'>
null = <'N;'>
integer = <'i:'> number <';'>
double = <'d:'> number <';'>
string = <'s:'> <size> <':"'> characters <'";'>
object = <'O:'> <size> <':{'> (string val)+ <'}'> <';'>?
reference = <'r:'> <refIndex>
enum = <'E:'> <size> <':"'> characters <'";'>
```

## Unserialize to JS types

**Primitive types**

```
'N;' → null
'b:0;' → false
's:5:"hello";' → "hello"
'i:123;' → 123
'd:123.45;' → 123.45
```

**Complex types**

- Enums:

Due to the lack of enums support in JavaScript, the `enum` expressions are parsed into plain strings.

```
'E:17:"Weekdays:Saturday";' → "Weekdays:Saturday;"
```

- Arrays:

Array is converted into a JS object if there is at least 1 non-numeric key.

```
'a:3:{i:0;i:1;i:1;i:2;i:2;i:3;}' → [1, 2, 3]

'a:3:{i:0;i:1;s:1:"a";i:2;i:2;i:3;}' → { "0": 1, "a": 2, "2": 3 }
```

- Objects:

```
'O:11:"MyClass":2:{s:3:"foo";s:3:"bar";s:3:"baz";i:123;}' → { "_type": "MyClass", "foo": "bar", "baz": 123 }


'O:2:"MyClass":1:{s:1:"a";i:10;s:1:"b";r:1;}}' → { _type: "MyClass", a: 10, b: [Circular] }
```

## References

1. [Parsing serialized PHP data with BNF using Instaparse - Stack Overflow](https://stackoverflow.com/q/18518499/5856760)
2. [PHP Documentation: serialize](https://www.php.net/manual/en/function.serialize.php)
