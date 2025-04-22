// 反debugger
(function() {
    const originalFunction = Function.prototype.constructor;
    
    Function.prototype.constructor = function() {
        let args = Array.from(arguments);
        let functionBody = args.pop();
        
        if (typeof functionBody === 'string') {
            // 移除所有的 debugger 语句
            functionBody = functionBody.replace(/debugger/g, '');
        }
        
        args.push(functionBody);
        return originalFunction.apply(this, args);
    };
    
    // 为了安全起见，也处理 eval
    const originalEval = window.eval;
    window.eval = function(code) {
        if (typeof code === 'string') {
            // 移除所有的 debugger 语句
            code = code.replace(/debugger/g, '');
        }
        return originalEval(code);
    };
})();