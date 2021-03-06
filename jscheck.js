// jscheck.js
// Douglas Crockford
// 2012-05-19

// Public Domain

/*global clearTimeout, setTimeout*/

/*properties
    apply, args, array, boolean, call, charAt, charCodeAt, character, check,
    claim, classification, classifier, clear, concat, detail, exception, fail,
    floor, forEach, fromCharCode, group, integer, isArray, join, keys, length,
    literal, lost, map, name, number, object, on_fail, on_lost, on_pass,
    on_report, on_result, one_of, pass, predicate, prototype, push, random,
    reduce, replace, reps, resolve, sequence, serial, signature, slice, sort,
    string, stringify, test, verdict
*/


var JSC = (function () {
    'use strict';

    var all,            // The collection of all claims
        detail = 3,     // The current level of report detail
        group,          // The collection of named groups of claims
        integer_prime = 1,
        integer_sq_2 = 9,
        integer_sqrt = 1,
        now_group,      // The current group
        on_fail,        // The function that receives the fail cases
        on_lost,        // The function that receives the lost cases
        on_pass,        // The function that receives the pass cases
        on_report,      // The function that receives the reportage
        on_result,      // The function that receives the summary
        reps = 100,     // The number of cases to be tried per claim
        slice = Array.prototype.slice,
        unique,         // Case serial number

        add = function (a, b) {
            return a + b;
        },
        resolve = function (value) {

// The resolve function takes a value. If that value is a function, then
// it is called to produce the return value.

            return typeof value === 'function'
                ? value.apply(null, slice.call(arguments, 1))
                : value;
        },
        integer = function (value) {
            value = resolve(value);
            return typeof value === 'number'
                ? Math.floor(value)
                : typeof value === 'string'
                ? value.charCodeAt(0)
                : undefined;
        },
        go = function (func, value) {
            if (value) {
                try {
                    func(value);
                } catch (ignore) {}
            }
        },

        jscheck = {
            array: function (dimension, value) {
                if (Array.isArray(dimension)) {
                    return function () {
                        return dimension.map(function (value) {
                            return resolve(value);
                        });
                    };
                }
                return function () {
                    var i,
                        n = resolve(dimension),
                        result = [];
                    if (typeof n === 'number' && isFinite(n)) {
                        for (i = 0; i < n; i += 1) {
                            result.push(resolve(value, i));
                        }
                    }
                    return result;
                };
            },
            boolean: function (bias) {

// A signature can contain a boolean specification. And optional bias parameter
// can be provided. If the bias is 0.25, then approximately a quarter of the
// booleans produced will be true.

                if (typeof bias !== 'number') {
                    bias = 0.50;
                }
                return function () {
                    return Math.random() < bias;
                };
            },
            character: function (i, j) {
                if (j === undefined) {
                    return function () {
                        return String.fromCharCode(integer(i));
                    };
                }
                var ji = jscheck.integer(i, j);
                return function () {
                    return String.fromCharCode(ji());
                };
            },
            check: function (claim, ms) {

// The check function optionally takes a claim function or the name of a group.
// The default is to check all claims.
// It returns a boolean which will be false if any case fails.
// Report texts may be sent to the function registered with on_report, depending
// on the level of detail.

                var array,
                    cases = {},
                    complete = false,
                    nr_pending = 0,
                    serials = [],
                    timeout_id;

                function generate_report() {
                    var class_fail,
                        class_pass,
                        class_lost,
                        i = 0,
                        lines = '',
                        next_case,
                        now_claim,
                        nr_class = 0,
                        nr_fail,
                        nr_lost,
                        nr_pass,
                        report = '',
                        the_case,
                        the_class,
                        total_fail = 0,
                        total_lost = 0,
                        total_pass = 0;

                    function generate_line(type, level) {
                        if (detail >= level) {
                            lines += " " + type + " [" + the_case.serial + "] " +
                                the_case.classification + (
                                    JSON.stringify(the_case.args)
                                        .replace(/^\[/, '(')
                                        .replace(/\]$/, ')')
                                ) + '\n';
                        }
                    }


                    function generate_class(key) {
                        if (detail >= 3 || class_fail[key] || class_lost[key]) {
                            report += ' ' + key + " pass " + class_pass[key] +
                                (class_fail[key] ? " fail " + class_fail[key] : '') +
                                (class_lost[key] ? " lost " + class_lost[key] : '') + '\n';
                        }
                    }


                    if (cases) {
                        if (timeout_id) {
                            clearTimeout(timeout_id);
                        }
                        for (;;) {
                            next_case = cases[serials[i]];
                            if (!next_case || (next_case.claim !== now_claim)) {
                                if (now_claim) {
                                    if (detail >= 1) {
                                        report += the_case.name + ": " +
                                            (nr_class ? nr_class + " classifications, " : "") +
                                            (nr_pass + nr_fail + nr_lost) +
                                            " cases tested, " + nr_pass + " pass" +
                                            (nr_fail ? ", " + nr_fail + " fail" : "") +
                                            (nr_lost ? ", " + nr_lost + " lost" : "") +
                                            '\n';
                                        if (nr_class && detail >= 2) {
                                            Object.keys(class_pass).sort().forEach(generate_class);
                                            report += lines;
                                        }
                                    }
                                    total_fail += nr_fail;
                                    total_lost += nr_lost;
                                    total_pass += nr_pass;
                                }
                                if (!next_case) {
                                    break;
                                }
                                nr_fail = nr_lost = nr_pass = 0;
                                class_pass = {};
                                class_fail = {};
                                class_lost = {};
                                lines = '';
                            }
                            the_case = next_case;
                            i += 1;
                            now_claim = the_case.claim;
                            the_class = the_case.classification;
                            if (the_class && typeof class_pass[the_class] !== 'number') {
                                class_pass[the_class] = 0;
                                class_fail[the_class] = 0;
                                class_lost[the_class] = 0;
                                nr_class += 1;
                            }
                            switch (the_case.pass) {
                            case true:
                                if (the_class) {
                                    class_pass[the_class] += 1;
                                }
                                if (detail >= 4) {
                                    generate_line("Pass", 4);
                                }
                                nr_pass += 1;
                                break;
                            case false:
                                if (the_class) {
                                    class_fail[the_class] += 1;
                                }
                                generate_line("FAIL", 2);
                                nr_fail += 1;
                                break;
                            default:
                                if (the_class) {
                                    class_lost[the_class] += 1;
                                }
                                generate_line("LOST", 2);
                                nr_lost += 1;
                                go(on_lost, the_case);
                            }
                        }
                        if (typeof claim === 'string' && detail >= 1) {
                            report = "Group " + claim + '\n\n' + report;
                        }
                        report += "\nTotal pass " + total_pass +
                            (total_fail ? ", fail " + total_fail : "") +
                            (total_lost ? ", lost " + total_lost : "") + '\n';
                        go(on_result, {
                            pass: total_pass,
                            fail: total_fail,
                            lost: total_lost
                        });
                        go(on_report, report);
                    }
                    cases = null;
                }


                function register(serial, value) {
                    var the_case;
                    if (cases) {
                        the_case = cases[serial];
                        if (the_case === undefined) {
                            cases[serial] = value;
                            serials.push(serial);
                            nr_pending += 1;
                        } else {
                            if (the_case.pass === undefined) {
                                if (value === true) {
                                    the_case.pass = true;
                                    go(on_pass, the_case);
                                } else if (value === false) {
                                    the_case.pass = false;
                                    go(on_fail, the_case);
                                } else {
                                    the_case.exception = value;
                                }
                                nr_pending -= 1;
                                if (nr_pending <= 0 && complete) {
                                    return generate_report();
                                }
                            } else {
                                throw the_case;
                            }
                        }
                    }
                    return value;
                }


                if (typeof claim === 'function') {
                    array = [claim];
                } else if (typeof claim === 'string') {
                    array = group[claim];
                    if (!Array.isArray(array)) {
                        throw new Error("Bad group " + claim);
                    }
                } else {
                    array = all;
                }
                unique = 0;
                array.forEach(function (claim) {
                    var at_most = reps * 10,
                        counter = 0,
                        i;
                    integer_sq_2 = 9;
                    integer_sqrt = 1;
                    integer_prime = 1;

// Loop over the generation and testing of cases.

                    for (counter = i = 0; counter < reps && i < at_most; i += 1) {
                        if (claim(register)) {
                            counter += 1;
                        }
                    }
                });
                complete = true;
                if (nr_pending <= 0) {
                    generate_report();
                } else if (ms > 0) {
                    timeout_id = setTimeout(generate_report, ms);
                }
                return jscheck;
            },
            claim: function (name, predicate, signature, classifier) {

// A claim consists of
//  a unique name which is displayed in the the report,
//  a predicate function which exercises the claim, and that will return true
//      if the claim holds,
//  a function signature for the function expressed as an array of type
//      specifiers or expressions,
//  an optional classifier function, which takes the same arguments as the
//      property function, and returns a string for classifying the subsets, or
//      false if the predicate should not be given this set of generated
//      arguments.

// A function is returned, which can be called by the check function.
// That function will also be deposited in the set of all claims.
// If a group name has been set, then the claim will also be deposited
// in the group.

                var grupo = now_group;

                function claim(register) {
                    var args = signature.map(function (value) {
                            return resolve(value);
                        }),
                        classification = '',
                        serial,
                        verdict;
                    if (typeof classifier === 'function') {
                        classification = classifier.apply(args, args);
                        if (typeof classification !== 'string') {
                            return false;
                        }
                    }
                    unique += 1;
                    serial = unique;
                    verdict = function (result) {
                        if (result === undefined) {
                            result = null;
                        }
                        return register(serial, result);
                    };
                    register(serial, {
                        args: args,
                        claim: claim,
                        classification: classification,
                        classifier: classifier,
                        group: grupo,
                        name: name,
                        predicate: predicate,
                        signature: signature,
                        serial: serial,
                        verdict: verdict
                    });
                    try {
                        predicate.apply(null, [verdict].concat(args));
                    } catch (e) {
                        verdict(typeof e === 'boolean' ? null : e);
                    }
                    return true;
                }

                if (grupo) {
                    if (!Array.isArray(group[grupo])) {
                        group[grupo] = [claim];
                    } else {
                        group[grupo].push(claim);
                    }
                }
                all.push(claim);
                return claim;
            },
            clear: function () {
                all = [];
                group = {};
                now_group = '';
                return jscheck;
            },
            detail: function (level) {
                detail = level;
                return jscheck;
            },
            group: function (name) {
                now_group = name || '';
                return jscheck;
            },
            integer: function (i, j) {
                if (i === undefined) {
                    return function () {
                        var factor,
                            reject;
                        do {
                            integer_prime += 2;
                            reject = false;
                            if (integer_prime >= integer_sq_2) {
                                reject = true;
                                integer_sqrt += 2;
                                integer_sq_2 = (integer_sqrt + 2) *
                                    (integer_sqrt + 2);
                            }
                            for (factor = 3; !reject && factor <= integer_sqrt;
                                    factor += 2) {
                                reject = integer_prime % factor === 0;
                            }
                        } while (reject);
                        return integer_prime;
                    };
                }
                i = integer(i, 0) || 0;
                j = integer(j, 0);
                if (j === undefined) {
                    j = i;
                    i = 1;
                }
                if (i === j) {
                    return i;
                }
                if (i > j) {
                    var t = i;
                    i = j;
                    j = t;
                }
                return function () {
                    return Math.floor(Math.random() * (j + 1 - i) + i);
                };
            },
            literal: function (value) {
                return function () {
                    return value;
                };
            },
            number: function (i, j) {
                i = +i || 0;
                j = +j;
                if (!isFinite(j)) {
                    j = i || 1;
                    i = 0;
                }
                if (i === j) {
                    return i;
                }
                if (i > j) {
                    var t = i;
                    i = j;
                    j = t;
                }
                return function () {
                    return Math.random() * (j - i) + i;
                };
            },
            object: function (object, value) {
                return function () {
                    var keys,
                        result = {},
                        values;

                    if (value === undefined) {
                        keys = resolve(object);
                        if (keys && typeof keys === 'object') {
                            Object.keys(keys).forEach(function (key) {
                                result[key] = resolve(keys[key]);
                            });
                            return result;
                        }
                    } else {
                        keys = resolve(object);
                        values = resolve(value);
                        if (Array.isArray(keys)) {
                            keys.forEach(function (key, i) {
                                i = i % values.length;
                                result[key] = resolve((Array.isArray(values)
                                    ? values[i]
                                    : value), i);
                            });
                            return result;
                        }
                    }
                    return null;
                };
            },
            one_of: function (array, weights) {

// The one_of specifier has two signatures.

//  one_of(array)
//      One element is taken from the array and resolved. The elements are
//      selected randomly with equal probabilities.

// one_of(array, weights)
//      The two arguments are both arrays with equal lengths. The larger
//      a weight, the more likely an element will be selected.

                if (typeof array === 'string') {
                    return function () {
                        return array.charAt(Math.floor(Math.random() *
                            array.length));
                    };
                }
                if (Array.isArray(array) && array.length > 0) {
                    if (!Array.isArray(weights)) {
                        return function () {
                            return resolve(array[Math.floor(Math.random() *
                                array.length)]);
                        };
                    }
                    if (array.length === weights.length) {
                        var base = 0,
                            n = array.length - 1,
                            total = weights.reduce(add, 0),
                            list = weights.map(function (value) {
                                base += value / total;
                                return base;
                            });
                        return function () {
                            var i, x = Math.random();
                            for (i = 0; i < n; i += 1) {
                                if (x < list[i]) {
                                    return resolve(array[i]);
                                }
                            }
                            return resolve(array[n]);
                        };
                    }
                }
                return null;
            },
            on_fail: function (func) {
                on_fail = func;
                return jscheck;
            },
            on_lost: function (func) {
                on_lost = func;
                return jscheck;
            },
            on_pass: function (func) {
                on_pass = func;
                return jscheck;
            },
            on_report: function (func) {
                on_report = func;
                return jscheck;
            },
            on_result: function (func) {
                on_result = func;
                return jscheck;
            },
            reps: function (number) {
                reps = number;
                return jscheck;
            },
            resolve: resolve,
            sequence: function (array) {
                var i = -1;

// A signature can contain a one of specification indicating one of the
// elements of an array. Those elements can be constants or other
// specifications.

                return function () {
                    i += 1;
                    if (i >= array.length) {
                        i = 0;
                    }
                    return resolve(array[i]);
                };
            },
            string: function (dimension, value) {
                if (value === undefined) {
                    return function () {
                        return JSON.stringify(resolve(dimension));
                    };
                }
                var ja = jscheck.array(dimension, value);
                return function () {
                    return ja().join('');
                };
            },
            test: function (name, predicate, signature, classifier, ms) {
                return JSC.check(JSC.claim(name, predicate, signature, classifier), ms);
            }
        };
    return jscheck.clear();
}());
