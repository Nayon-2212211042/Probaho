# Probaho language reference · প্রবাহ ভাষার নির্দেশিকা

## 1. Basics

- A statement ends at a new line, or at `;` if you want several on one line.
- Blocks use `{ ... }`.
- Comments start with `#` and run to the end of the line.
- Strings use double quotes and support `\n`, `\t`, `\"` and `\\`.
- Numbers can be written with Bangla digits (`১২.৫`) or English digits (`12.5`).
- Names can contain Bangla letters, English letters, digits and `_`, but cannot start with a digit.

```
# একটি ছোট প্রোগ্রাম
ধরি নাম = "রহিম"
ছাপো "হ্যালো, " + নাম
```

## 2. Keywords · কীওয়ার্ড

| Bangla | English alias | Meaning |
|---|---|---|
| `ধরি` | `let` | declare a variable |
| `যদি` | `if` | if |
| `নাহলে` | `else` | else |
| `যতক্ষণ` | `while` | while loop |
| `ফাংশন` | `fn` | function |
| `ফেরত` | `return` | return |
| `ছাপো` | `print` | print |
| `সত্য` / `মিথ্যা` | `true` / `false` | booleans |
| `এবং` / `অথবা` / `না` | `and` / `or` / `not` | logic |
| `থামো` | `break` | leave the loop |
| `পরেরটা` | `continue` | next iteration |

All keywords are defined in `src/keywords.js`.

## 3. Values

| Type | Bangla name | Examples |
|---|---|---|
| number | সংখ্যা | `৫`, `৩.১৪`, `-২` |
| string | লেখা | `"বাংলা"` |
| boolean | সত্য/মিথ্যা | `সত্য`, `মিথ্যা` |
| list | তালিকা | `[১, ২, ৩]` |
| nothing | শূন্য | what a function returns when it has no `ফেরত` |
| function | ফাংশন | `ফাংশন f() { }` |

**Truthiness:** only `মিথ্যা`, `০` and nothing count as false in conditions. Everything else is true.

## 4. Operators

From the lowest to the highest precedence:

| Operators | Notes |
|---|---|
| `অথবা` | returns the first true side, and skips the right side if the left is true |
| `এবং` | skips the right side if the left is false |
| `==` `!=` | lists are compared item by item |
| `<` `>` `<=` `>=` | numbers with numbers, or strings with strings |
| `+` `-` | `+` also joins two strings or two lists |
| `*` `/` `%` | division or remainder by zero is an error |
| `না` `-` (unary) | |
| calls `f(x)` and index `xs[i]` | |

`"a" + ১` is an error. Convert first: `"a" + লেখা(১)`.

## 5. Statements

```
ধরি x = ৫                # declare
x = x + ১                # assign
xs[০] = ১০               # assign to a list item

যদি x > ৫ {
  ছাপো "বড়"
} নাহলে যদি x == ৫ {
  ছাপো "সমান"
} নাহলে {
  ছাপো "ছোট"
}

যতক্ষণ x < ১০ {
  x = x + ১
  যদি x == ৭ { পরেরটা }
  যদি x == ৯ { থামো }
}

ছাপো x, "a", সত্য         # print several values, separated by a space
```

`নাহলে` may start on the line after the closing `}`.

## 6. Functions

```
ফাংশন যোগফল(a, b) {
  ফেরত a + b
}
ছাপো যোগফল(২, ৩)
```

- A function without `ফেরত` gives nothing.
- Functions are values and can be returned, and they remember the variables around them (closures).
- Calling a function with the wrong number of arguments is an error.
- Recursion is limited to a depth of 1000 calls.

## 7. Lists and strings

```
ধরি ফল = ["আম", "জাম"]
যোগ(ফল, "কাঁঠাল")
ছাপো ফল[০], দৈর্ঘ্য(ফল)     # আম 3
```

- Indexes start at 0. An index outside the list is an error.
- Strings can be indexed but not changed in place.
- Strings are measured the way a reader sees them: `দৈর্ঘ্য("কি")` is 1 and `দৈর্ঘ্য("বাংলা")` is 2 (`বাং` and `লা`).

## 8. Built-in functions

| Function | English alias | Does |
|---|---|---|
| `দৈর্ঘ্য(x)` | `len` | length of a list or string |
| `যোগ(list, x)` | `append` | adds `x` to the end of the list |
| `সংখ্যা(x)` | `number` | converts a string such as `"১২"` to a number |
| `লেখা(x)` | `str` | converts any value to a string |

You can create your own variable with a built-in's name, but you cannot overwrite the built-in in place.

## 9. Scope

Each `{ }` block has its own scope. A name can only be declared once per scope, but an inner scope can declare the same name again (shadowing). Assignment (`x = ...`) changes the nearest existing variable.

## 10. Limits

- A program stops with an error after 1,000,000 loop iterations and function calls (a guard against infinite loops).
- Function calls can nest 1000 deep.

## 11. Grammar

```
program     = { statement } ;
statement   = varDecl | assignment | ifStmt | whileStmt
            | funcDecl | returnStmt | printStmt
            | "থামো" | "পরেরটা" | exprStmt ;
varDecl     = "ধরি" IDENT "=" expr ;
assignment  = IDENT [ "[" expr "]" ] "=" expr ;
ifStmt      = "যদি" expr block [ "নাহলে" ( ifStmt | block ) ] ;
whileStmt   = "যতক্ষণ" expr block ;
funcDecl    = "ফাংশন" IDENT "(" [ params ] ")" block ;
returnStmt  = "ফেরত" [ expr ] ;
printStmt   = "ছাপো" expr { "," expr } ;
block       = "{" { statement } "}" ;

expr        = or ;
or          = and { "অথবা" and } ;
and         = equality { "এবং" equality } ;
equality    = comparison { ( "==" | "!=" ) comparison } ;
comparison  = term { ( "<" | ">" | "<=" | ">=" ) term } ;
term        = factor { ( "+" | "-" ) factor } ;
factor      = unary { ( "*" | "/" | "%" ) unary } ;
unary       = ( "না" | "-" ) unary | call ;
call        = primary { "(" [ args ] ")" | "[" expr "]" } ;
primary     = NUMBER | STRING | "সত্য" | "মিথ্যা"
            | IDENT | "(" expr ")" | "[" [ args ] "]" ;
```
