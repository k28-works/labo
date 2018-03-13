//
// chakra.js
//

try {
    var console = {};
    var process = {};
    var shell = {};
    var file = {};
    var path = {};
    var using = {};
    (function () {
        var x_select = function (object, callback) {
            var ret = [];
            for (var i = 0, num = object.Count(); i < num; ++i) {
                if (callback(object.Item(i))) {
                    ret.push(object.Item(i));
                }
            }
            return ret;
        }
        //
        // console
        //
        console.log = function (text) {
            WScript.StdOut.WriteLine(text);
        };
        console.write = function (text) {
            WScript.StdOut.Write(text);
        };
        console.writeln = function (text) {
            WScript.StdOut.WriteLine(text);
        };
        //
        // process
        //
        process.exit = function (error) {
            // WScript.Quit(error || 0);
            throw {
                exit: error || 0,
            };
        };
        if (WScript.Arguments.length > 0) {
            process.source = WScript.Arguments(0);
            process.argc = WScript.Arguments.length - 1;
            process.argv = [];
            for (var i = 1, num = WScript.Arguments; i < WScript.Arguments.length; ++i) {
                process.argv.push(WScript.Arguments(i));
            }
        }
        else {
            process.exit(0);
        }
        //
        // shell
        //
        var shell_ = WScript.CreateObject("WScript.Shell");
        shell.exec = function (command) {
            var exec_ = shell_.Exec('CMD /C ' + command);
            var result_ = exec_.StdOut.ReadAll();
            return {
                result: result_,
                error: exec_.ExitCode
            };
        };
        //
        // file
        //
        var fso_ = WScript.CreateObject("Scripting.FileSystemObject");
        file.exists = function (pathspec) {
            return fso_.FileExists(pathspec) || fso_.FolderExists(pathspec);
        };
        //
        // path
        //
        path.separator = '/';
        path.join = function () {
            return arguments.join('/').replace(/\\/g, '/').replace(/\/+/g, path.separator);
        };
        //
        // using
        //
        var BufferInterface = function (stream) {
            var stream_ = stream || WScript.CreateObject("ADODB.Stream");
            this.open = function () {
                stream_.Open();
            };
            this.close = function () {
                stream_.Close();
            };
            this.save = function (pathspec) {
                stream_.SaveToFile(pathspec, file.exists(pathspec) ? 2 : 1);
            };
            this.load = function (pathspec) {
                stream_.LoadFromFile(pathspec);
            };
            this.size = function () {
                return stream_.Size;
            };
            this.position = function () {
                return stream_.Position;
            };
            this.seek = function (position) {
                stream_.Position = position;
            };
        }
        var TextBuffer = function () {
            var stream_ = WScript.CreateObject("ADODB.Stream");
            var buffer_ = new BufferInterface(stream_);
            buffer_.open = function () {
                stream_.Open();
                stream_.Charset = "utf-8";
            };
            buffer_.write = function (text) {
                stream_.WriteText(text);
            };
            buffer_.writeln = function (text) {
                stream_.WriteText(text, 1);
            };
            buffer_.read = function (num) {
                return stream_.ReadText(num || -1);
            };
            buffer_.readln = function () {
                return stream_.ReadText(-2);
            };
            buffer_.save = function (pathspec) {
                stream_.Position = 0;
                stream_.Type = 1;
                stream_.Position = 3;
                var bytes = stream_.Read();
                stream_.Position = 0;
                stream_.Write(bytes);
                stream_.SetEOS();
                stream_.SaveToFile(pathspec, file.exists(pathspec) ? 2 : 1);
                stream_.Type = 2;
            };
            return buffer_;
        };
        var DataBuffer = function () {
            var stream_ = WScript.CreateObject("ADODB.Stream");
            var buffer_ = new BufferInterface(stream_);
            var dom_ = WScript.CreateObject("Msxml2.DOMDocument.6.0");
            var typed_value_ = dom_.createElement("typed_value");
            typed_value_.dataType = 'bin.hex';
            buffer_.open = function () {
                stream_.Open();
                stream_.Type = 1;
            };
            buffer_.write = function (data) {
                stream_.Write(data);
            };
            buffer_.write_bytes = function (bytes) {
                typed_value_.text = bytes.map(function (value) {
                    return value.toString(16);
                }).join('');
                stream.Write(typed_value_.nodeTypedValue);
            };
            buffer_.read = function (num) {
                return stream_.Read(num || -1);
            };
            buffer_.read_bytes = function (num) {
                typed_value_.nodeTypedValue = stream_.Read(num || -1);
                return (typed_value_.text.match(/.{2}/g) || []).map(function (hex) {
                    return parseInt(hex, 16);
                });
            };
            buffer_.int2hex = function (int, size) {
                var padding = size ? size * 2 : 8;
                return ('0'.repeat(padding) + (int >>> 0).toString(16)).slice(-padding);
            };
            buffer.hex2bytes = function (hex) {
                return (hex.match(/.{2}/g)).map(function (byte) {
                    return parseInt(byte, 16);
                });
            };
            return buffer_;
        };
        using.text_buffer = function (callback) {
            var buffer = new TextBuffer();
            try {
                buffer.open();
                return callback(buffer);
            }
            finally {
                buffer.close();
            }
        };
        using.data_buffer = function (callback) {
            var buffer = new DataBuffer();
            try {
                buffer.open();
                return callback(buffer);
            }
            finally {
                buffer.close();
            }
        };
    }());

    if (process.source && file.exists(process.source)) {
        try {
            eval(using.text_buffer(function (buffer) {
                buffer.load(process.source);
                while (buffer.read(1) == '@') {
                    buffer.readln();
                }
                buffer.seek(buffer.position() - 1);
                return buffer.read();
            }));
        }
        catch (e) {
            if (!e.hasOwnProperty('exit')) {
                console.log(e.name + ': ' + e.message);
            }
        }
        finally {
            process.exit();
        }
    }
}
catch (e) {
    // console.log(JSON.stringify(e));
}

// EOF //
