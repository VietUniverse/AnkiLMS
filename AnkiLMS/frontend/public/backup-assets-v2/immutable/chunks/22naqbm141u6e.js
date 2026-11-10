(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,787323,737024,918102,996108,660728,628028,394433,240940,345284,t=>{"use strict";var e,r=t.i(124314);class i{constructor(t){"number"==typeof t?this.rawBinaryData=new ArrayBuffer(t):t instanceof Uint8Array?this.rawBinaryData=t.buffer:this.rawBinaryData=t,this.uint32View=new Uint32Array(this.rawBinaryData),this.float32View=new Float32Array(this.rawBinaryData),this.size=this.rawBinaryData.byteLength}get int8View(){return this._int8View||(this._int8View=new Int8Array(this.rawBinaryData)),this._int8View}get uint8View(){return this._uint8View||(this._uint8View=new Uint8Array(this.rawBinaryData)),this._uint8View}get int16View(){return this._int16View||(this._int16View=new Int16Array(this.rawBinaryData)),this._int16View}get int32View(){return this._int32View||(this._int32View=new Int32Array(this.rawBinaryData)),this._int32View}get float64View(){return this._float64Array||(this._float64Array=new Float64Array(this.rawBinaryData)),this._float64Array}get bigUint64View(){return this._bigUint64Array||(this._bigUint64Array=new BigUint64Array(this.rawBinaryData)),this._bigUint64Array}view(t){return this[`${t}View`]}destroy(){this.rawBinaryData=null,this.uint32View=null,this.float32View=null,this.uint16View=null,this._int8View=null,this._uint8View=null,this._int16View=null,this._int32View=null,this._float64Array=null,this._bigUint64Array=null}static sizeOf(t){switch(t){case"int8":case"uint8":return 1;case"int16":case"uint16":return 2;case"int32":case"uint32":case"float32":return 4;default:throw Error(`${t} isn't a valid view type`)}}}t.s(["ViewableBuffer",0,i],737024);var s=t.i(649864),n=t.i(148446);function a(t,e,r,i){if(r??(r=0),i??(i=Math.min(t.byteLength-r,e.byteLength)),7&r||7&i)if(3&r||3&i)new Uint8Array(e).set(new Uint8Array(t,r,i));else{let s=i/4;new Float32Array(e,0,s).set(new Float32Array(t,r,s))}else{let s=i/8;new Float64Array(e,0,s).set(new Float64Array(t,r,s))}}t.s(["fastCopy",0,a],918102);let o={normal:"normal-npm",add:"add-npm",screen:"screen-npm"};var u=((e=u||{})[e.DISABLED=0]="DISABLED",e[e.RENDERING_MASK_ADD=1]="RENDERING_MASK_ADD",e[e.MASK_ACTIVE=2]="MASK_ACTIVE",e[e.INVERSE_MASK_ACTIVE=3]="INVERSE_MASK_ACTIVE",e[e.RENDERING_MASK_REMOVE=4]="RENDERING_MASK_REMOVE",e[e.NONE=5]="NONE",e);function l(t,e){return"no-premultiply-alpha"===e.alphaMode&&o[t]||t}t.s(["BLEND_TO_NPM",0,o,"STENCIL_MODES",0,u],996108),t.s(["getAdjustedBlendModeBlend",0,l],660728);var h=t.i(729281);function d(t,e){if(0===t)throw Error("Invalid value of `0` passed to `checkMaxIfStatementsInShader`");let r=e.createShader(e.FRAGMENT_SHADER);try{for(;;){let i="precision mediump float;\nvoid main(void){\nfloat test = 0.1;\n%forloop%\ngl_FragColor = vec4(0.0);\n}".replace(/%forloop%/gi,function(t){let e="";for(let r=0;r<t;++r)r>0&&(e+="\nelse "),r<t-1&&(e+=`if(test == ${r}.0){}`);return e}(t));if(e.shaderSource(r,i),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS))break;t=t/2|0}}finally{e.deleteShader(r)}return t}t.s(["checkMaxIfStatementsInShader",0,d],628028);let c=null;function f(){if(c)return c;let t=(0,h.getTestContext)();return c=d(c=t.getParameter(t.MAX_TEXTURE_IMAGE_UNITS),t),t.getExtension("WEBGL_lose_context")?.loseContext(),c}t.s(["getMaxTexturesPerBatch",0,f],394433);class m{constructor(){this.ids=Object.create(null),this.textures=[],this.count=0}clear(){for(let t=0;t<this.count;t++){let e=this.textures[t];this.textures[t]=null,this.ids[e.uid]=null}this.count=0}}t.s(["BatchTextureArray",0,m],240940);class p{constructor(){this.renderPipeId="batch",this.action="startBatch",this.start=0,this.size=0,this.textures=new m,this.blendMode="normal",this.topology="triangle-strip",this.canBundle=!0}destroy(){this.textures=null,this.gpuBindGroup=null,this.bindGroup=null,this.batcher=null,this.elements=null}}let g=[],x=0;function b(){return x>0?g[--x]:new p}function _(t){t.elements=null,g[x++]=t}n.GlobalResourceRegistry.register({clear:()=>{if(g.length>0)for(let t of g)t&&t.destroy();g.length=0,x=0}});let y=0,v=class t{constructor(e){this.uid=(0,r.uid)("batcher"),this.dirty=!0,this.batchIndex=0,this.batches=[],this._elements=[],(e={...t.defaultOptions,...e}).maxTextures||((0,s.deprecation)("v8.8.0","maxTextures is a required option for Batcher now, please pass it in the options"),e.maxTextures=f());const{maxTextures:n,attributesInitialSize:a,indicesInitialSize:o}=e;this.attributeBuffer=new i(4*a),this.indexBuffer=new Uint16Array(o),this.maxTextures=n}begin(){this.elementSize=0,this.elementStart=0,this.indexSize=0,this.attributeSize=0;for(let t=0;t<this.batchIndex;t++)_(this.batches[t]);this.batchIndex=0,this._batchIndexStart=0,this._batchIndexSize=0,this.dirty=!0}add(t){this._elements[this.elementSize++]=t,t._indexStart=this.indexSize,t._attributeStart=this.attributeSize,t._batcher=this,this.indexSize+=t.indexSize,this.attributeSize+=t.attributeSize*this.vertexSize}checkAndUpdateTexture(t,e){let r=t._batch.textures.ids[e._source.uid];return(!!r||0===r)&&(t._textureId=r,t.texture=e,!0)}updateElement(t){this.dirty=!0;let e=this.attributeBuffer;t.packAsQuad?this.packQuadAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId):this.packAttributes(t,e.float32View,e.uint32View,t._attributeStart,t._textureId)}break(t){let e=this._elements;if(!e[this.elementStart])return;let r=b(),i=r.textures;i.clear();let s=e[this.elementStart],n=l(s.blendMode,s.texture._source),a=s.topology;4*this.attributeSize>this.attributeBuffer.size&&this._resizeAttributeBuffer(4*this.attributeSize),this.indexSize>this.indexBuffer.length&&this._resizeIndexBuffer(this.indexSize);let o=this.attributeBuffer.float32View,u=this.attributeBuffer.uint32View,h=this.indexBuffer,d=this._batchIndexSize,c=this._batchIndexStart,f="startBatch",m=[],p=this.maxTextures;for(let s=this.elementStart;s<this.elementSize;++s){let g=e[s];e[s]=null;let x=g.texture._source,_=l(g.blendMode,x),v=n!==_||a!==g.topology;if(x._batchTick===y&&!v){g._textureId=x._textureBindLocation,d+=g.indexSize,g.packAsQuad?(this.packQuadAttributes(g,o,u,g._attributeStart,g._textureId),this.packQuadIndex(h,g._indexStart,g._attributeStart/this.vertexSize)):(this.packAttributes(g,o,u,g._attributeStart,g._textureId),this.packIndex(g,h,g._indexStart,g._attributeStart/this.vertexSize)),g._batch=r,m.push(g);continue}x._batchTick=y,(i.count>=p||v)&&(this._finishBatch(r,c,d-c,i,n,a,t,f,m),f="renderBatch",c=d,n=_,a=g.topology,(i=(r=b()).textures).clear(),m=[],++y),g._textureId=x._textureBindLocation=i.count,i.ids[x.uid]=i.count,i.textures[i.count++]=x,g._batch=r,m.push(g),d+=g.indexSize,g.packAsQuad?(this.packQuadAttributes(g,o,u,g._attributeStart,g._textureId),this.packQuadIndex(h,g._indexStart,g._attributeStart/this.vertexSize)):(this.packAttributes(g,o,u,g._attributeStart,g._textureId),this.packIndex(g,h,g._indexStart,g._attributeStart/this.vertexSize))}i.count>0&&(this._finishBatch(r,c,d-c,i,n,a,t,f,m),c=d,++y),this.elementStart=this.elementSize,this._batchIndexStart=c,this._batchIndexSize=d}_finishBatch(t,e,r,i,s,n,a,o,u){t.gpuBindGroup=null,t.bindGroup=null,t.action=o,t.batcher=this,t.textures=i,t.blendMode=s,t.topology=n,t.start=e,t.size=r,t.elements=u,++y,this.batches[this.batchIndex++]=t,a.add(t)}finish(t){this.break(t)}ensureAttributeBuffer(t){4*t<=this.attributeBuffer.size||this._resizeAttributeBuffer(4*t)}ensureIndexBuffer(t){t<=this.indexBuffer.length||this._resizeIndexBuffer(t)}_resizeAttributeBuffer(t){let e=new i(Math.max(t,2*this.attributeBuffer.size));a(this.attributeBuffer.rawBinaryData,e.rawBinaryData),this.attributeBuffer=e}_resizeIndexBuffer(t){let e=this.indexBuffer,r=Math.max(t,1.5*e.length);r+=r%2;let i=r>65535?new Uint32Array(r):new Uint16Array(r);if(i.BYTES_PER_ELEMENT!==e.BYTES_PER_ELEMENT)for(let t=0;t<e.length;t++)i[t]=e[t];else a(e.buffer,i.buffer);this.indexBuffer=i}packQuadIndex(t,e,r){t[e]=r+0,t[e+1]=r+1,t[e+2]=r+2,t[e+3]=r+0,t[e+4]=r+2,t[e+5]=r+3}packIndex(t,e,r,i){let s=t.indices,n=t.indexSize,a=t.indexOffset,o=t.attributeOffset;for(let t=0;t<n;t++)e[r++]=i+s[t+a]-o}destroy(t={}){if(null!==this.batches){for(let t=0;t<this.batchIndex;t++)_(this.batches[t]);this.batches=null,this.geometry.destroy(!0),this.geometry=null,t.shader&&(this.shader?.destroy(),this.shader=null);for(let t=0;t<this._elements.length;t++)this._elements[t]&&(this._elements[t]._batch=null);this._elements=null,this.indexBuffer=null,this.attributeBuffer.destroy(),this.attributeBuffer=null}}};v.defaultOptions={maxTextures:null,attributesInitialSize:4,indicesInitialSize:6},t.s(["Batch",0,p,"Batcher",0,v],787323);var S=t.i(485465),T=t.i(64957),w=t.i(860406);let A=new Float32Array(1),E=new Uint32Array(1);class B extends w.Geometry{constructor(){const t=new S.Buffer({data:A,label:"attribute-batch-buffer",usage:T.BufferUsage.VERTEX|T.BufferUsage.COPY_DST,shrinkToFit:!1});super({attributes:{aPosition:{buffer:t,format:"float32x2",stride:24,offset:0},aUV:{buffer:t,format:"float32x2",stride:24,offset:8},aColor:{buffer:t,format:"unorm8x4",stride:24,offset:16},aTextureIdAndRound:{buffer:t,format:"uint16x2",stride:24,offset:20}},indexBuffer:new S.Buffer({data:E,label:"index-batch-buffer",usage:T.BufferUsage.INDEX|T.BufferUsage.COPY_DST,shrinkToFit:!1})})}}t.s(["BatchGeometry",0,B],345284)},197828,275392,633219,t=>{"use strict";var e=t.i(347760),r=t.i(787323),i=t.i(345284),s=t.i(281491),n=t.i(268372),a=t.i(394111),o=t.i(355443),u=t.i(277953),l=t.i(965654);class h extends l.Shader{constructor(t){super({glProgram:(0,s.compileHighShaderGlProgram)({name:"batch",bits:[n.colorBitGl,(0,a.generateTextureBatchBitGl)(t),o.roundPixelsBitGl]}),gpuProgram:(0,s.compileHighShaderGpuProgram)({name:"batch",bits:[n.colorBit,(0,a.generateTextureBatchBit)(t),o.roundPixelsBit]}),resources:{batchSamplers:(0,u.getBatchSamplersUniformGroup)(t)}}),this.maxTextures=t}}t.s(["DefaultShader",0,h],275392);let d=null,c=class t extends r.Batcher{constructor(e){super(e),this.geometry=new i.BatchGeometry,this.name=t.extension.name,this.vertexSize=6,d??(d=new h(e.maxTextures)),this.shader=d}packAttributes(t,e,r,i,s){let n=s<<16|65535&t.roundPixels,a=t.transform,o=a.a,u=a.b,l=a.c,h=a.d,d=a.tx,c=a.ty,{positions:f,uvs:m}=t,p=t.color,g=t.attributeOffset,x=g+t.attributeSize;for(let t=g;t<x;t++){let s=2*t,a=f[s],g=f[s+1];e[i++]=o*a+l*g+d,e[i++]=h*g+u*a+c,e[i++]=m[s],e[i++]=m[s+1],r[i++]=p,r[i++]=n}}packQuadAttributes(t,e,r,i,s){let n=t.texture,a=t.transform,o=a.a,u=a.b,l=a.c,h=a.d,d=a.tx,c=a.ty,f=t.bounds,m=f.maxX,p=f.minX,g=f.maxY,x=f.minY,b=n.uvs,_=t.color,y=s<<16|65535&t.roundPixels;e[i+0]=o*p+l*x+d,e[i+1]=h*x+u*p+c,e[i+2]=b.x0,e[i+3]=b.y0,r[i+4]=_,r[i+5]=y,e[i+6]=o*m+l*x+d,e[i+7]=h*x+u*m+c,e[i+8]=b.x1,e[i+9]=b.y1,r[i+10]=_,r[i+11]=y,e[i+12]=o*m+l*g+d,e[i+13]=h*g+u*m+c,e[i+14]=b.x2,e[i+15]=b.y2,r[i+16]=_,r[i+17]=y,e[i+18]=o*p+l*g+d,e[i+19]=h*g+u*p+c,e[i+20]=b.x3,e[i+21]=b.y3,r[i+22]=_,r[i+23]=y}_updateMaxTextures(t){this.shader.maxTextures!==t&&(d=new h(t),this.shader=d)}destroy(){this.shader=null,super.destroy()}};c.extension={type:[e.ExtensionType.Batcher],name:"default"},t.s(["DefaultBatcher",0,c],197828),t.s(["GCManagedHash",0,class{constructor(t){this.items=Object.create(null);const{renderer:e,type:r,onUnload:i,priority:s,name:n}=t;this._renderer=e,e.gc.addResourceHash(this,"items",r,s??0),this._onUnload=i,this.name=n}add(t){return!this.items[t.uid]&&(this.items[t.uid]=t,t.once("unload",this.remove,this),t._gcLastUsed=this._renderer.gc.now,!0)}remove(t,...e){if(!this.items[t.uid])return;let r=t._gpuData[this._renderer.uid];r&&(this._onUnload?.(t,...e),t.off("unload",this.remove,this),r.destroy(),t._gpuData[this._renderer.uid]=null,this.items[t.uid]=null)}removeAll(...t){Object.values(this.items).forEach(e=>e&&this.remove(e,...t))}destroy(...t){this.removeAll(...t),this.items=Object.create(null),this._renderer=null,this._onUnload=null}}],633219)},281491,694571,919273,649008,338939,158313,241183,383438,401560,268372,394111,355443,t=>{"use strict";var e=t.i(481107),r=t.i(527076),i=t.i(485830);function s(t,e,r){if(t)for(let s in t){let n=e[s.toLocaleLowerCase()];if(n){let e=t[s];"header"===s&&(e=e.replace(/@in\s+[^;]+;\s*/g,"").replace(/@out\s+[^;]+;\s*/g,"")),r&&n.push(`//----${r}----//`),n.push(e)}else(0,i.warn)(`${s} placement hook does not exist in shader`)}}t.s(["addBits",0,s],694571);let n=/\{\{(.*?)\}\}/g;function a(t){let e={};return(t.match(n)?.map(t=>t.replace(/[{()}]/g,""))??[]).forEach(t=>{e[t]=[]}),e}function o(t,e){let r,i=/@in\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function u(t,e,r=!1){let i=[];o(e,i),t.forEach(t=>{t.header&&o(t.header,i)}),r&&i.sort();let s=i.map((t,e)=>`       @location(${e}) ${t},`).join("\n"),n=e.replace(/@in\s+[^;]+;\s*/g,"");return n.replace("{{in}}",`
${s}
`)}function l(t,e){let r,i=/@out\s+([^;]+);/g;for(;null!==(r=i.exec(t));)e.push(r[1])}function h(t,e){let r=[];l(e,r),t.forEach(t=>{t.header&&l(t.header,r)});let i=0,s=r.sort().map(t=>t.indexOf("builtin")>-1?t:`@location(${i++}) ${t}`).join(",\n"),n=r.sort().map(t=>`       var ${t.replace(/@.*?\s+/g,"")};`).join("\n"),a=`return VSOutput(
            ${r.sort().map(t=>{let e;return` ${(e=/\b(\w+)\s*:/g.exec(t))?e[1]:""}`}).join(",\n")});`,o=e.replace(/@out\s+[^;]+;\s*/g,"");return(o=(o=o.replace("{{struct}}",`
${s}
`)).replace("{{start}}",`
${n}
`)).replace("{{return}}",`
${a}
`)}function d(t,e){let r=t;for(let t in e){let i=e[t];r=i.join("\n").length?r.replace(`{{${t}}}`,`//-----${t} START-----//
${i.join("\n")}
//----${t} FINISH----//`):r.replace(`{{${t}}}`,"")}return r}t.s(["compileHooks",0,a],919273),t.s(["compileInputs",0,u],649008),t.s(["compileOutputs",0,h],338939),t.s(["injectBits",0,d],158313);let c=Object.create(null),f=new Map,m=0;function p({template:t,bits:e}){var r,i;let s,n,a,o=x(t,e);if(c[o])return c[o];let{vertex:l,fragment:d}=(r=t,s=(i=e).map(t=>t.vertex).filter(t=>!!t),n=i.map(t=>t.fragment).filter(t=>!!t),a=u(s,r.vertex,!0),{vertex:a=h(s,a),fragment:u(n,r.fragment,!0)});return c[o]=b(l,d,e),c[o]}function g({template:t,bits:e}){let r=x(t,e);return c[r]||(c[r]=b(t.vertex,t.fragment,e)),c[r]}function x(t,e){return e.map(t=>(f.has(t)||f.set(t,m++),f.get(t))).sort((t,e)=>t-e).join("-")+t.vertex+t.fragment}function b(t,e,r){let i=a(t),n=a(e);return r.forEach(t=>{s(t.vertex,i,t.name),s(t.fragment,n,t.name)}),{vertex:d(t,i),fragment:d(e,n)}}t.s(["compileHighShader",0,p,"compileHighShaderGl",0,g],241183);let _=`
    @in aPosition: vec2<f32>;
    @in aUV: vec2<f32>;

    @out @builtin(position) vPosition: vec4<f32>;
    @out vUV : vec2<f32>;
    @out vColor : vec4<f32>;

    {{header}}

    struct VSOutput {
        {{struct}}
    };

    @vertex
    fn main( {{in}} ) -> VSOutput {

        var worldTransformMatrix = globalUniforms.uWorldTransformMatrix;
        var modelMatrix = mat3x3<f32>(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        var position = aPosition;
        var uv = aUV;

        {{start}}

        vColor = vec4<f32>(1., 1., 1., 1.);

        {{main}}

        vUV = uv;

        var modelViewProjectionMatrix = globalUniforms.uProjectionMatrix * worldTransformMatrix * modelMatrix;

        vPosition =  vec4<f32>((modelViewProjectionMatrix *  vec3<f32>(position, 1.0)).xy, 0.0, 1.0);

        vColor *= globalUniforms.uWorldColorAlpha;

        {{end}}

        {{return}}
    };
`,y=`
    @in vUV : vec2<f32>;
    @in vColor : vec4<f32>;

    {{header}}

    @fragment
    fn main(
        {{in}}
      ) -> @location(0) vec4<f32> {

        {{start}}

        var outColor:vec4<f32>;

        {{main}}

        var finalColor:vec4<f32> = outColor * vColor;

        {{end}}

        return finalColor;
      };
`,v=`
    in vec2 aPosition;
    in vec2 aUV;

    out vec4 vColor;
    out vec2 vUV;

    {{header}}

    void main(void){

        mat3 worldTransformMatrix = uWorldTransformMatrix;
        mat3 modelMatrix = mat3(
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0
          );
        vec2 position = aPosition;
        vec2 uv = aUV;

        {{start}}

        vColor = vec4(1.);

        {{main}}

        vUV = uv;

        mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;

        gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);

        vColor *= uWorldColorAlpha;

        {{end}}
    }
`,S=`

    in vec4 vColor;
    in vec2 vUV;

    out vec4 finalColor;

    {{header}}

    void main(void) {

        {{start}}

        vec4 outColor;

        {{main}}

        finalColor = outColor * vColor;

        {{end}}
    }
`;t.s(["fragmentGPUTemplate",0,y,"fragmentGlTemplate",0,S,"vertexGPUTemplate",0,_,"vertexGlTemplate",0,v],383438);let T={name:"global-uniforms-bit",vertex:{header:`
        struct GlobalUniforms {
            uProjectionMatrix:mat3x3<f32>,
            uWorldTransformMatrix:mat3x3<f32>,
            uWorldColorAlpha: vec4<f32>,
            uResolution: vec2<f32>,
        }

        @group(0) @binding(0) var<uniform> globalUniforms : GlobalUniforms;
        `}},w={name:"global-uniforms-ubo-bit",vertex:{header:`
          uniform globalUniforms {
            mat3 uProjectionMatrix;
            mat3 uWorldTransformMatrix;
            vec4 uWorldColorAlpha;
            vec2 uResolution;
          };
        `}},A={name:"global-uniforms-bit",vertex:{header:`
          uniform mat3 uProjectionMatrix;
          uniform mat3 uWorldTransformMatrix;
          uniform vec4 uWorldColorAlpha;
          uniform vec2 uResolution;
        `}};t.s(["globalUniformsBit",0,T,"globalUniformsBitGl",0,A,"globalUniformsUBOBitGl",0,w],401560),t.s(["compileHighShaderGlProgram",0,function({bits:t,name:r}){return new e.GlProgram({name:r,...g({template:{vertex:v,fragment:S},bits:[A,...t]})})},"compileHighShaderGpuProgram",0,function({bits:t,name:e}){let i=p({template:{fragment:y,vertex:_},bits:[T,...t]});return r.GpuProgram.from({name:e,vertex:{source:i.vertex,entryPoint:"main"},fragment:{source:i.fragment,entryPoint:"main"}})}],281491);let E={name:"color-bit",vertex:{header:`
            @in aColor: vec4<f32>;
        `,main:`
            vColor *= vec4<f32>(aColor.rgb * aColor.a, aColor.a);
        `}},B={name:"color-bit",vertex:{header:`
            in vec4 aColor;
        `,main:`
            vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
        `}};t.s(["colorBit",0,E,"colorBitGl",0,B],268372);let I={},P={};t.s(["generateTextureBatchBit",0,function(t){return I[t]||(I[t]={name:"texture-batch-bit",vertex:{header:`
                @in aTextureIdAndRound: vec2<u32>;
                @out @interpolate(flat) vTextureId : u32;
            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1)
                {
                    vPosition = vec4<f32>(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
                }
            `},fragment:{header:`
                @in @interpolate(flat) vTextureId: u32;

                ${function(t){let e=[];if(1===t)e.push("@group(1) @binding(0) var textureSource1: texture_2d<f32>;"),e.push("@group(1) @binding(1) var textureSampler1: sampler;");else{let r=0;for(let i=0;i<t;i++)e.push(`@group(1) @binding(${r++}) var textureSource${i+1}: texture_2d<f32>;`),e.push(`@group(1) @binding(${r++}) var textureSampler${i+1}: sampler;`)}return e.join("\n")}(t)}
            `,main:`
                var uvDx = dpdx(vUV);
                var uvDy = dpdy(vUV);

                ${function(t){let e=[];if(1===t)e.push("outColor = textureSampleGrad(textureSource1, textureSampler1, vUV, uvDx, uvDy);");else{e.push("switch vTextureId {");for(let r=0;r<t;r++)r===t-1?e.push("  default:{"):e.push(`  case ${r}:{`),e.push(`      outColor = textureSampleGrad(textureSource${r+1}, textureSampler${r+1}, vUV, uvDx, uvDy);`),e.push("      break;}");e.push("}")}return e.join("\n")}(t)}
            `}}),I[t]},"generateTextureBatchBitGl",0,function(t){return P[t]||(P[t]={name:"texture-batch-bit",vertex:{header:`
                in vec2 aTextureIdAndRound;
                out float vTextureId;

            `,main:`
                vTextureId = aTextureIdAndRound.y;
            `,end:`
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `},fragment:{header:`
                in float vTextureId;

                uniform sampler2D uTextures[${t}];

            `,main:`

                ${function(t){let e=[];for(let r=0;r<t;r++)r>0&&e.push("else"),r<t-1&&e.push(`if(vTextureId < ${r}.5)`),e.push("{"),e.push(`	outColor = texture(uTextures[${r}], vUV);`),e.push("}");return e.join("\n")}(t)}
            `}}),P[t]}],394111);let V={name:"round-pixels-bit",vertex:{header:`
            fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}},C={name:"round-pixels-bit",vertex:{header:`
            vec2 roundPixels(vec2 position, vec2 targetSize)
            {
                return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
            }
        `}};t.s(["roundPixelsBit",0,V,"roundPixelsBitGl",0,C],355443)},481107,142933,919993,696641,330650,589235,864408,846820,359762,298799,892513,359782,874436,90492,527076,t=>{"use strict";let e;var r,i=t.i(101928),s=t.i(729281);function n(){if(!e){e="mediump";let t=(0,s.getTestContext)();t&&t.getShaderPrecisionFormat&&(e=t.getShaderPrecisionFormat(t.FRAGMENT_SHADER,t.HIGH_FLOAT).precision?"highp":"mediump")}return e}function a(t,e,r){return e?t:r?(t=t.replace("out vec4 finalColor;",""),`

        #ifdef GL_ES // This checks if it is WebGL1
        #define in varying
        #define finalColor gl_FragColor
        #define texture texture2D
        #endif
        ${t}
        `):`

        #ifdef GL_ES // This checks if it is WebGL1
        #define in attribute
        #define out varying
        #endif
        ${t}
        `}t.s(["getMaxFragmentPrecision",0,n],142933),t.s(["addProgramDefines",0,a],919993);let o=/\buniform\s+([iu]?sampler\w+)/g,u=/\bprecision\s+\w+\s+([iu]?sampler\w+)\s*;/g,l={sampler2D:"lowp",samplerCube:"lowp"};function h(t,e,r){let i=r?e.maxSupportedFragmentPrecision:e.maxSupportedVertexPrecision;if("precision"!==t.substring(0,9)){let s=r?e.requestedFragmentPrecision:e.requestedVertexPrecision;"highp"===s&&"highp"!==i&&(s="mediump"),t=`precision ${s} float;
${t}`}else"highp"!==i&&"precision highp"===t.substring(0,15)&&(t=t.replace("precision highp","precision mediump"));var s=t,n="highp"===e.maxSupportedFragmentPrecision?"highp":"mediump";let a=new Set,h="";for(let[,t]of s.matchAll(u))a.add(t);for(let[,t]of s.matchAll(o))a.has(t)||(a.add(t),h+=`precision ${l[t]??n} ${t};
`);return h+s}function d(t,e){return e?`#version 300 es
${t}`:t}t.s(["ensurePrecision",0,h],696641),t.s(["insertVersion",0,d],330650);let c={},f={};function m(t,{name:e="pixi-program"},r=!0){e=e.replace(/\s+/g,"-")+(r?"-fragment":"-vertex");let i=r?c:f;if(i[e]?(i[e]++,e+=`-${i[e]}`):i[e]=1,-1!==t.indexOf("#define SHADER_NAME"))return t;let s=`#define SHADER_NAME ${e}`;return`${s}
${t}`}function p(t,e){return e?t.replace("#version 300 es",""):t}t.s(["setProgramName",0,m],589235),t.s(["stripVersion",0,p],864408);let g={stripVersion:p,ensurePrecision:h,addProgramDefines:a,setProgramName:m,insertVersion:d},x=Object.create(null),b=class t{constructor(e){const r=-1!==(e={...t.defaultOptions,...e}).fragment.indexOf("#version 300 es"),s={stripVersion:r,ensurePrecision:{requestedFragmentPrecision:e.preferredFragmentPrecision,requestedVertexPrecision:e.preferredVertexPrecision,maxSupportedVertexPrecision:"highp",maxSupportedFragmentPrecision:n()},setProgramName:{name:e.name},addProgramDefines:r,insertVersion:r};let a=e.fragment,o=e.vertex;Object.keys(g).forEach(t=>{let e=s[t];a=g[t](a,e,!0),o=g[t](o,e,!1)}),this.fragment=a,this.vertex=o,this.transformFeedbackVaryings=e.transformFeedbackVaryings,this._key=(0,i.createIdFromString)(`${this.vertex}:${this.fragment}`,"gl-program")}destroy(){this.fragment=null,this.vertex=null,this._attributeData=null,this._uniformData=null,this._uniformBlockData=null,this.transformFeedbackVaryings=null,x[this._cacheKey]=null}static from(e){let r=`${e.vertex}:${e.fragment}`;return x[r]||(x[r]=new t(e),x[r]._cacheKey=r),x[r]}};b.defaultOptions={preferredVertexPrecision:"highp",preferredFragmentPrecision:"mediump"},t.s(["GlProgram",0,b],481107);let _={uint8x2:{size:2,stride:2,normalised:!1},uint8x4:{size:4,stride:4,normalised:!1},sint8x2:{size:2,stride:2,normalised:!1},sint8x4:{size:4,stride:4,normalised:!1},unorm8x2:{size:2,stride:2,normalised:!0},unorm8x4:{size:4,stride:4,normalised:!0},snorm8x2:{size:2,stride:2,normalised:!0},snorm8x4:{size:4,stride:4,normalised:!0},uint16x2:{size:2,stride:4,normalised:!1},uint16x4:{size:4,stride:8,normalised:!1},sint16x2:{size:2,stride:4,normalised:!1},sint16x4:{size:4,stride:8,normalised:!1},unorm16x2:{size:2,stride:4,normalised:!0},unorm16x4:{size:4,stride:8,normalised:!0},snorm16x2:{size:2,stride:4,normalised:!0},snorm16x4:{size:4,stride:8,normalised:!0},float16x2:{size:2,stride:4,normalised:!1},float16x4:{size:4,stride:8,normalised:!1},float32:{size:1,stride:4,normalised:!1},float32x2:{size:2,stride:8,normalised:!1},float32x3:{size:3,stride:12,normalised:!1},float32x4:{size:4,stride:16,normalised:!1},uint32:{size:1,stride:4,normalised:!1},uint32x2:{size:2,stride:8,normalised:!1},uint32x3:{size:3,stride:12,normalised:!1},uint32x4:{size:4,stride:16,normalised:!1},sint32:{size:1,stride:4,normalised:!1},sint32x2:{size:2,stride:8,normalised:!1},sint32x3:{size:3,stride:12,normalised:!1},sint32x4:{size:4,stride:16,normalised:!1}};function y(t){return _[t]??_.float32}t.s(["getAttributeInfoFromFormat",0,y],846820);let v={f32:"float32","vec2<f32>":"float32x2","vec3<f32>":"float32x3","vec4<f32>":"float32x4",vec2f:"float32x2",vec3f:"float32x3",vec4f:"float32x4",i32:"sint32","vec2<i32>":"sint32x2","vec3<i32>":"sint32x3","vec4<i32>":"sint32x4",vec2i:"sint32x2",vec3i:"sint32x3",vec4i:"sint32x4",u32:"uint32","vec2<u32>":"uint32x2","vec3<u32>":"uint32x3","vec4<u32>":"uint32x4",vec2u:"uint32x2",vec3u:"uint32x3",vec4u:"uint32x4",bool:"uint32","vec2<bool>":"uint32x2","vec3<bool>":"uint32x3","vec4<bool>":"uint32x4"},S=/@location\((\d+)\)\s+([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_<>]+)(?:,|\s|\)|$)/g;function T(t,e){let r;for(;null!==(r=S.exec(t));){let t=v[r[3]]??"float32";e[r[2]]={location:parseInt(r[1],10),format:t,stride:y(t).stride,offset:0,instance:!1,start:0}}S.lastIndex=0}function w({source:t,entryPoint:e}){let r={},i=t.replace(/\/\/.*$/gm,"").replace(/\/\*[\s\S]*?\*\//g,""),s=i.indexOf(`fn ${e}(`);if(-1===s)return r;let n=i.indexOf("->",s);if(-1===n)return r;let a=i.substring(s,n);if(T(a,r),0===Object.keys(r).length){let t=a.match(/\(\s*\w+\s*:\s*(\w+)/);if(t){let e=t[1],s=RegExp(`struct\\s+${e}\\s*\\{([^}]+)\\}`,"s"),n=i.match(s);n&&T(n[1],r)}}return r}function A(t){let e=/@group\((\d+)\)/,r=/@binding\((\d+)\)/,i=/var(<[^>]+>)? (\w+)/,s=/:\s*([\w<>]+)/,n=/(\w+)\s*:\s*([\w\<\>]+)/g,a=/struct\s+(\w+)/,o=t.match(/(^|[^/])@(group|binding)\(\d+\)[^;]+;/g)?.map(t=>{let n,a=t.match(i),o=a?.[1]??"";return"<uniform>"===o?n="uniform":o.startsWith("<storage")&&(n="storage"),{group:parseInt(t.match(e)[1],10),binding:parseInt(t.match(r)[1],10),name:a[2],accessMode:n,type:t.match(s)[1]}});if(!o)return{groups:[],structs:[]};let u=t.match(/struct\s+(\w+)\s*{([^}]+)}/g)?.map(t=>{let e=t.match(a)[1],r=t.match(n).reduce((t,e)=>{let[r,i]=e.split(":");return t[r.trim()]=i.trim(),t},{});return r?{name:e,members:r}:null}).filter(({name:t})=>o.some(e=>e.type===t||e.type.includes(`<${t}>`)))??[];return{groups:o,structs:u}}t.s(["extractAttributesFromGpuProgram",0,w],359762),t.s(["extractStructAndGroups",0,A],298799);var E=((r=E||{})[r.VERTEX=1]="VERTEX",r[r.FRAGMENT=2]="FRAGMENT",r[r.COMPUTE=4]="COMPUTE",r);function B(t){return t.endsWith("<u32>")?"uint":t.endsWith("<i32>")?"sint":"float"}function I({groups:t}){let e=[];for(let r=0;r<t.length;r++){let i=t[r];e[i.group]||(e[i.group]=[]),"uniform"===i.accessMode?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,buffer:{type:"uniform"}}):"storage"===i.accessMode?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,buffer:{type:"read-only-storage"}}):"sampler"===i.type?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,sampler:{type:"filtering"}}):"sampler_comparison"===i.type?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,sampler:{type:"comparison"}}):"texture_2d"===i.type||i.type.startsWith("texture_2d<")?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:B(i.type),viewDimension:"2d",multisampled:!1}}):"texture_depth_2d"===i.type?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:"depth",viewDimension:"2d",multisampled:!1}}):"texture_depth_2d_array"===i.type?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:"depth",viewDimension:"2d-array",multisampled:!1}}):"texture_2d_array"===i.type||i.type.startsWith("texture_2d_array<")?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:B(i.type),viewDimension:"2d-array",multisampled:!1}}):"texture_3d"===i.type||i.type.startsWith("texture_3d<")?e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:B(i.type),viewDimension:"3d",multisampled:!1}}):("texture_cube"===i.type||i.type.startsWith("texture_cube<"))&&e[i.group].push({binding:i.binding,visibility:E.VERTEX|E.FRAGMENT,texture:{sampleType:B(i.type),viewDimension:"cube",multisampled:!1}})}for(let t=0;t<e.length;t++)e[t]||(e[t]=[]);return e}function P({groups:t}){let e=[];for(let r=0;r<t.length;r++){let i=t[r];e[i.group]||(e[i.group]={}),e[i.group][i.name]=i.binding}return e}function V(t,e){let r=new Set,i=new Set;return{structs:[...t.structs,...e.structs].filter(t=>!r.has(t.name)&&(r.add(t.name),!0)),groups:[...t.groups,...e.groups].filter(t=>{let e=`${t.name}-${t.binding}`;return!i.has(e)&&(i.add(e),!0)})}}t.s(["ShaderStage",0,E],892513),t.s(["generateGpuLayoutGroups",0,I],359782),t.s(["generateLayoutHash",0,P],874436),t.s(["removeStructAndGroupDuplicates",0,V],90492);let C=Object.create(null);t.s(["GpuProgram",0,class t{constructor(t){this._layoutKey=0,this._attributeLocationsKey=0;const{fragment:e,vertex:r,layout:i,gpuLayout:s,name:n}=t;if(this.name=n,this.fragment=e,this.vertex=r,e.source===r.source){const t=A(e.source);this.structsAndGroups=t}else{const t=A(r.source),i=A(e.source);this.structsAndGroups=V(t,i)}this.layout=i??P(this.structsAndGroups),this.gpuLayout=s??I(this.structsAndGroups),this.autoAssignGlobalUniforms=this.layout[0]?.globalUniforms!==void 0,this.autoAssignLocalUniforms=this.layout[1]?.localUniforms!==void 0,this._generateProgramKey()}_generateProgramKey(){let{vertex:t,fragment:e}=this,r=t.source+e.source+t.entryPoint+e.entryPoint;this._layoutKey=(0,i.createIdFromString)(r,"program")}get attributeData(){return this._attributeData??(this._attributeData=w(this.vertex)),this._attributeData}destroy(){this.gpuLayout=null,this.layout=null,this.structsAndGroups=null,this.fragment=null,this.vertex=null,C[this._cacheKey]=null}static from(e){let r=`${e.vertex.source}:${e.fragment.source}:${e.fragment.entryPoint}:${e.vertex.entryPoint}`;return C[r]||(C[r]=new t(e),C[r]._cacheKey=r),C[r]}}],527076)},277953,t=>{"use strict";var e=t.i(432543);let r={};t.s(["getBatchSamplersUniformGroup",0,function(t){let i=r[t];if(i)return i;let s=new Int32Array(t);for(let e=0;e<t;e++)s[e]=e;return r[t]=new e.UniformGroup({uTextures:{value:s,type:"i32",size:t}},{isStatic:!0})}])},729281,t=>{"use strict";let e;var r=t.i(527402);t.s(["getTestContext",0,function(){return(!e||e?.isContextLost())&&(e=r.DOMAdapter.get().createCanvas().getContext("webgl",{})),e}])},227462,t=>{"use strict";var e=t.i(485830);t.s(["BindGroup",0,class{constructor(t){this.resources=Object.create(null),this._resourceKeysValue=null,this._dirty=!0;let e=0;for(const r in t){const i=t[r];this.setResource(i,e++)}}get _resourceKeys(){return this._resourceKeysValue??(this._resourceKeysValue=Object.keys(this.resources).map(Number)),this._resourceKeysValue}get _key(){if(this._dirty){this._dirty=!1;let t=[],e=0;for(let r in this.resources)t[e++]=this.resources[r]?this.resources[r]._resourceId:-1;this._keyValue=t.join("|")}return this._keyValue}setResource(t,e){let r=this.resources[e];t!==r&&(r&&r.off?.("change",this.onResourceChange,this),t.on?.("change",this.onResourceChange,this),void 0===r&&(this._resourceKeysValue=null),this.resources[e]=t,this._dirty=!0)}getResource(t){return this.resources[t]}_touch(t){let e=this.resources,r=this._resourceKeys;for(let i=0;i<r.length;i++){let s=e[r[i]];s&&(s._gcLastUsed=t)}}destroy(){let t=this.resources;for(let e in t){let r=t[e];r?.off?.("change",this.onResourceChange,this)}this.resources=null,this._resourceKeysValue=null}onResourceChange(t){if(this._dirty=!0,t.destroyed){let r=this.resources;for(let e in r)r[e]===t&&(r[e]=null);(0,e.warn)(`[BindGroup] a '${t._resourceType}' was destroyed while still bound to a shader. Remove it from the shader before destroying it.`)}}}])},860406,64957,485465,332439,252345,t=>{"use strict";var e,r=t.i(595932),i=t.i(869553),s=t.i(124314),n=t.i(649864),a=r,o=((e=o||{})[e.MAP_READ=1]="MAP_READ",e[e.MAP_WRITE=2]="MAP_WRITE",e[e.COPY_SRC=4]="COPY_SRC",e[e.COPY_DST=8]="COPY_DST",e[e.INDEX=16]="INDEX",e[e.VERTEX=32]="VERTEX",e[e.UNIFORM=64]="UNIFORM",e[e.STORAGE=128]="STORAGE",e[e.INDIRECT=256]="INDIRECT",e[e.QUERY_RESOLVE=512]="QUERY_RESOLVE",e[e.STATIC=1024]="STATIC",e);t.s(["BufferUsage",0,o],64957);class u extends a.default{constructor(t){let{data:e,size:r}=t;const{usage:i,label:n,shrinkToFit:a}=t;super(),this._gpuData=Object.create(null),this._gcLastUsed=-1,this.autoGarbageCollect=!0,this.uid=(0,s.uid)("buffer"),this._resourceType="buffer",this._resourceId=(0,s.uid)("resource"),this._updateID=1,this._updateOffset=0,this._dataInt32=null,this.shrinkToFit=!0,this.destroyed=!1,e instanceof Array&&(e=new Float32Array(e)),this._data=e,r??(r=e?.byteLength);const o=!!e;this.descriptor={size:r,usage:i,mappedAtCreation:o,label:n},this.shrinkToFit=a??!0}get data(){return this._data}set data(t){this.setDataWithSize(t,t.length,!0)}get dataInt32(){return this._dataInt32||(this._dataInt32=new Int32Array(this.data.buffer)),this._dataInt32}get static(){return!!(this.descriptor.usage&o.STATIC)}set static(t){t?this.descriptor.usage|=o.STATIC:this.descriptor.usage&=~o.STATIC}setDataWithSize(t,e,r){if(this._updateID++,this._updateSize=e*t.BYTES_PER_ELEMENT,this._updateOffset=0,this._data===t){r&&this.emit("update",this);return}let i=this._data;(this._data=t,this._dataInt32=null,i&&i.length===t.length)?r&&this.emit("update",this):!this.shrinkToFit&&i&&t.byteLength<i.byteLength?r&&this.emit("update",this):(this.descriptor.size=t.byteLength,this._resourceId=(0,s.uid)("resource"),this.emit("change",this))}update(t,e){this._updateSize=t??this._updateSize,this._updateOffset=e||0,this._updateID++,this.emit("update",this)}unload(){for(let t in this.emit("unload",this),this._gpuData)this._gpuData[t]?.destroy();this._gpuData=Object.create(null),this.destroyed||(this._resourceId=(0,s.uid)("resource"),this.emit("change",this))}destroy(){this.destroyed=!0,this.unload(),this.emit("destroy",this),this.emit("change",this),this._data=null,this.descriptor=null,this.removeAllListeners()}}function l(t,e){if(!(t instanceof u)){let r=e?o.INDEX:o.VERTEX;t instanceof Array&&(e?(t=new Uint32Array(t),r=o.INDEX|o.COPY_DST):(t=new Float32Array(t),r=o.VERTEX|o.COPY_DST)),t=new u({data:t,label:e?"index-mesh-buffer":"vertex-mesh-buffer",usage:r})}return t}function h(t,e,r){let i=t.getAttribute(e);if(!i)return r.minX=0,r.minY=0,r.maxX=0,r.maxY=0,r;let s=i.buffer.data,n=1/0,a=1/0,o=-1/0,u=-1/0,l=s.BYTES_PER_ELEMENT,h=(i.offset||0)/l,d=(i.stride||8)/l;for(let t=h;t<s.length;t+=d){let e=s[t],r=s[t+1];e>o&&(o=e),r>u&&(u=r),e<n&&(n=e),r<a&&(a=r)}return r.minX=n,r.minY=a,r.maxX=o,r.maxY=u,r}t.s(["Buffer",0,u],485465),t.s(["ensureIsBuffer",0,l],332439),t.s(["getGeometryBounds",0,h],252345);class d extends r.default{constructor(t={}){super(),this._gpuData=Object.create(null),this.autoGarbageCollect=!0,this._gcLastUsed=-1,this.uid=(0,s.uid)("geometry"),this._layoutKey=0,this.instanceCount=1,this.indexCount=0,this._bounds=new i.Bounds,this._boundsDirty=!0,this._vertexCount=0,this._vertexCountDirty=!0;const{attributes:e,indexBuffer:r,topology:n}=t;if(this.buffers=[],this.attributes={},e)for(const t in e)this.addAttribute(t,e[t]);this.instanceCount=t.instanceCount??1,this.indexCount=t.indexCount??0,r&&this.addIndex(r),this.topology=n||"triangle-list"}onBufferUpdate(){this._boundsDirty=!0,this._vertexCountDirty=!0,this.emit("update",this)}getAttribute(t){return this.attributes[t]}getIndex(){return this.indexBuffer}getBuffer(t){return this.getAttribute(t).buffer}get vertexCount(){if(!this._vertexCountDirty)return this._vertexCount;this._vertexCountDirty=!1;let t=this.attributes;for(let e in t){let r=t[e];if(r.instance)continue;let i=r.buffer;return this._vertexCount=i.data.length/(r.stride/4||r.size),this._vertexCount}return this._vertexCount=0,0}getSize(){return(0,n.deprecation)("8.20.0","Geometry.getSize is deprecated, please use Geometry.vertexCount instead."),this.vertexCount}addAttribute(t,e){var r;let i=(((r=e)instanceof u||Array.isArray(r)||r.BYTES_PER_ELEMENT)&&(r={buffer:r}),r.buffer=l(r.buffer,!1),r);-1===this.buffers.indexOf(i.buffer)&&(this.buffers.push(i.buffer),i.buffer.on("update",this.onBufferUpdate,this),i.buffer.on("change",this.onBufferUpdate,this)),this.attributes[t]=i,this._vertexCountDirty=!0}addIndex(t){this.indexBuffer=l(t,!0),this.buffers.push(this.indexBuffer)}get bounds(){return this._boundsDirty?(this._boundsDirty=!1,h(this,"aPosition",this._bounds)):this._bounds}unload(){for(let t in this.emit("unload",this),this._gpuData)this._gpuData[t]?.destroy();this._gpuData=Object.create(null)}destroy(t=!1){for(let e of(this.emit("destroy",this),this.buffers))e.off("update",this.onBufferUpdate,this),e.off("change",this.onBufferUpdate,this),t&&e.destroy();this.unload(),this.removeAllListeners(),this.attributes=null,this.buffers=null,this.indexBuffer=null,this._bounds=null}}t.s(["Geometry",0,d],860406)},965654,t=>{"use strict";var e=t.i(595932),r=t.i(124314),i=t.i(485830),s=t.i(481107),n=t.i(227462),a=t.i(527076),o=t.i(818279),u=t.i(655075),l=t.i(432543);class h extends e.default{constructor(t){super(),this.uid=(0,r.uid)("shader"),this._uniformBindMap=Object.create(null),this._ownedBindGroups=[],this._destroyed=!1;let{gpuProgram:e,glProgram:s,groups:a,resources:h,compatibleRenderers:d,groupMap:c,overrides:f}=t;this._overrides=f?u.ShaderOverrides.from(f):null,this.gpuProgram=e,this.glProgram=s,void 0===d&&(d=0,e&&(d|=o.RendererType.WEBGPU),s&&(d|=o.RendererType.WEBGL)),this.compatibleRenderers=d;const m={};if(c)for(const t in c)for(const e in c[t]){const r=c[t][e];m[r]={group:t,binding:e,name:r}}if(h||a||(h={}),h&&a)throw Error("[Shader] Cannot have both resources and groups");if(e||!a||c){if(e&&a&&!c){const t=e.structsAndGroups.groups;c={},t.forEach(t=>{c[t.group]=c[t.group]||{},c[t.group][t.binding]=t.name,m[t.name]=t})}else if(h){a={},c||(c={}),e&&e.structsAndGroups.groups.forEach(t=>{c[t.group]=c[t.group]||{},c[t.group][t.binding]=t.name,m[t.name]=t});let t=0;for(const r in h)!m[r]&&(e&&!s&&(0,i.warn)(`[Shader] the resource '${r}' matches no binding in the WGSL source \u2014 is the name correct?`),a[99]||(a[99]=new n.BindGroup,this._ownedBindGroups.push(a[99])),m[r]={group:99,binding:t,name:r},c[99]=c[99]||{},c[99][t]=r,t++);for(const t in h){let e=h[t];e.source||e._resourceType||(e=new l.UniformGroup(e));const r=m[t];r&&(a[r.group]||(a[r.group]=new n.BindGroup,this._ownedBindGroups.push(a[r.group])),a[r.group].setResource(e,r.binding))}}}else throw Error("[Shader] No group map or WebGPU shader provided - consider using resources instead.");this.groups=a,this._uniformBindMap=c,this.resources=this._buildResourceAccessor(a,m)}addResource(t,e,r){var i,s;(i=this._uniformBindMap)[e]||(i[e]={}),(s=this._uniformBindMap[e])[r]||(s[r]=t),this.groups[e]||(this.groups[e]=new n.BindGroup,this._ownedBindGroups.push(this.groups[e]))}_buildResourceAccessor(t,e){let r={};for(let i in e){let s=e[i];Object.defineProperty(r,s.name,{get:()=>t[s.group].getResource(s.binding),set(e){t[s.group].setResource(e,s.binding)}})}return r}destroy(t=!1){this._destroyed||(this._destroyed=!0,this.emit("destroy",this),t&&(this.gpuProgram?.destroy(),this.glProgram?.destroy()),this.gpuProgram=null,this.glProgram=null,this.removeAllListeners(),this._uniformBindMap=null,this._ownedBindGroups.forEach(t=>{t.destroy()}),this._ownedBindGroups=null,this.resources=null,this.groups=null,this._overrides=null)}static from(t){let e,r,{gpu:i,gl:n,...o}=t;return i&&(e=a.GpuProgram.from(i)),n&&(r=s.GlProgram.from(n)),new h({gpuProgram:e,glProgram:r,...o})}}t.s(["Shader",0,h])},432543,187953,413685,t=>{"use strict";var e=t.i(595932),r=t.i(124314),i=t.i(101928);let s=["f32","i32","u32","vec2<f32>","vec3<f32>","vec4<f32>","mat2x2<f32>","mat3x3<f32>","mat4x4<f32>","mat3x2<f32>","mat4x2<f32>","mat2x3<f32>","mat4x3<f32>","mat2x4<f32>","mat3x4<f32>","vec2<i32>","vec3<i32>","vec4<i32>","vec2<u32>","vec3<u32>","vec4<u32>"],n=s.reduce((t,e)=>(t[e]=!0,t),{});function a(t,e){switch(t){case"f32":return 0;case"vec2<f32>":return new Float32Array(2*e);case"vec3<f32>":return new Float32Array(3*e);case"vec4<f32>":return new Float32Array(4*e);case"mat2x2<f32>":return new Float32Array([1,0,0,1]);case"mat3x3<f32>":return new Float32Array([1,0,0,0,1,0,0,0,1]);case"mat4x4<f32>":return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}return null}t.s(["UNIFORM_TYPES_MAP",0,n,"UNIFORM_TYPES_VALUES",0,s],187953),t.s(["getDefaultUniformValue",0,a],413685);let o=class t extends e.default{constructor(e,o){super(),this.uid=(0,r.uid)("uniform"),this._resourceType="uniformGroup",this._resourceId=(0,r.uid)("resource"),this.isUniformGroup=!0,this._dirtyId=0,this.destroyed=!1,o={...t.defaultOptions,...o},this.uniformStructures=e;const u={};for(const t in e){const r=e[t];if(r.name=t,r.size=r.size??1,!n[r.type]){const t=r.type.match(/^array<(\w+(?:<\w+>)?),\s*(\d+)>$/);if(t){const[,e,i]=t;throw Error(`Uniform type ${r.type} is not supported. Use type: '${e}', size: ${i} instead.`)}throw Error(`Uniform type ${r.type} is not supported. Supported uniform types are: ${s.join(", ")}`)}r.value??(r.value=a(r.type,r.size)),u[t]=r.value}this.uniforms=u,this._dirtyId=1,this.ubo=o.ubo,this.isStatic=o.isStatic,this._signature=(0,i.createIdFromString)(Object.keys(u).map(t=>`${t}-${e[t].type}`).join("-"),"uniform-group")}get buffer(){return this._buffer}set buffer(t){this._buffer!==t&&(this._buffer?.off("change",this.onBufferChange,this),this._buffer=t,t?.on("change",this.onBufferChange,this))}get _gcLastUsed(){return this._buffer?._gcLastUsed??-1}set _gcLastUsed(t){this._buffer&&(this._buffer._gcLastUsed=t)}onBufferChange(){this._resourceId=(0,r.uid)("resource"),this.emit("change",this)}update(){this._dirtyId++}};o.defaultOptions={ubo:!1,isStatic:!1},t.s(["UniformGroup",0,o],432543)},822558,t=>{"use strict";let e={normal:0,add:1,multiply:2,screen:3,overlay:4,erase:5,"normal-npm":6,"add-npm":7,"screen-npm":8,min:9,max:10},r={BLEND:0,OFFSET:1,CULLING:2,DEPTH_TEST:3,WINDING:4,DEPTH_MASK:5},{BLEND:i,OFFSET:s,CULLING:n,DEPTH_TEST:a,WINDING:o,DEPTH_MASK:u}=r,l=class t{constructor(){this.data=0,this.blendMode="normal",this.polygonOffset=0,this.blend=!0,this.depthMask=!0}get blend(){return!!(this.data&1<<i)}set blend(t){!!(this.data&1<<i)!==t&&(this.data^=1<<i)}get offsets(){return!!(this.data&1<<s)}set offsets(t){!!(this.data&1<<s)!==t&&(this.data^=1<<s)}set cullMode(t){if("none"===t){this.culling=!1;return}this.culling=!0,this.clockwiseFrontFace="front"===t}get cullMode(){return this.culling?this.clockwiseFrontFace?"front":"back":"none"}get culling(){return!!(this.data&1<<n)}set culling(t){!!(this.data&1<<n)!==t&&(this.data^=1<<n)}get depthTest(){return!!(this.data&1<<a)}set depthTest(t){!!(this.data&1<<a)!==t&&(this.data^=1<<a)}get depthMask(){return!!(this.data&1<<u)}set depthMask(t){!!(this.data&1<<u)!==t&&(this.data^=1<<u)}get clockwiseFrontFace(){return!!(this.data&1<<o)}set clockwiseFrontFace(t){!!(this.data&1<<o)!==t&&(this.data^=1<<o)}get blendMode(){return this._blendMode}set blendMode(t){this.blend="none"!==t,this._blendMode=t,this._blendModeId=e[t]||0}get polygonOffset(){return this._polygonOffset}set polygonOffset(t){this.offsets=!!t,this._polygonOffset=t}toString(){return`[pixi.js/core:State blendMode=${this.blendMode} clockwiseFrontFace=${this.clockwiseFrontFace} culling=${this.culling} depthMask=${this.depthMask} polygonOffset=${this.polygonOffset}]`}static for2d(){let e=new t;return e.depthTest=!1,e.depthMask=!1,e.blend=!0,e}};l.default2d=l.for2d(),t.s(["STATE_BITS",0,r,"State",0,l])},101928,t=>{"use strict";let e=Object.create(null),r=Object.create(null);t.s(["createIdFromString",0,function(t,i){let s=r[t];return void 0===s&&(void 0===e[i]&&(e[i]=1),r[t]=s=e[i]++),s}])},818279,655075,t=>{"use strict";var e,r=((e=r||{})[e.WEBGL=1]="WEBGL",e[e.WEBGPU=2]="WEBGPU",e[e.CANVAS=4]="CANVAS",e[e.BOTH=3]="BOTH",e);t.s(["RendererType",0,r],818279);var i=t.i(101928);t.s(["ShaderOverrides",0,class t{constructor(t){this.data={...t};const e=Object.keys(t).sort().map(e=>`${e}:${t[e]}`).join("|");this.id=(0,i.createIdFromString)(e,"shader-overrides")}static from(e){return e instanceof t?e:new t(e)}}],655075)},889506,t=>{"use strict";t.s(["color32BitToUniform",0,function(t,e,r){let i=(t>>24&255)/255;e[r++]=(255&t)/255*i,e[r++]=(t>>8&255)/255*i,e[r++]=(t>>16&255)/255*i,e[r++]=i},"colorToUniform",0,function(t,e,r,i){r[i++]=(t>>16&255)/255,r[i++]=(t>>8&255)/255,r[i++]=(255&t)/255,r[i++]=e}])}]);