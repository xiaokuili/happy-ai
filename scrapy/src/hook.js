

// 先保留原 constructor
Function.prototype.constructor_ = Function.prototype.constructor;
Function.prototype.constructor = function (a) {
    // 如果参数为 debugger，就返回空方法
    if(a == "debugger") {
        return function (){};
    }
    // 如果参数不为 debugger，还是返回原方法
    return Function.prototype.constructor_(a);
};