/**
 * مدخل حزمة Three.js المدمجة في الملفّ الواحد: يُعاد تصدير ما يحتاجه المجلس المجسّم فقط (النواة + إضاءة بيئية ومعالجة لاحقة
 * من أمثلة three)، ويُحزم بـ esbuild إلى src/vendor/three-global.js (كائن عامّ THREE) بالأداة tools/build-three.mjs.
 */
export {
 Scene, PerspectiveCamera, WebGLRenderer, WebGLRenderTarget, Group, Mesh, Object3D, Color, Vector2, Vector3, Vector4, Quaternion, Euler, MathUtils, Raycaster, Clock,
 MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, MeshLambertMaterial, SpriteMaterial, Sprite, PointsMaterial, Points,
 SphereGeometry, CylinderGeometry, BoxGeometry, PlaneGeometry, TorusGeometry, LatheGeometry, CapsuleGeometry, RingGeometry, CircleGeometry, ConeGeometry, TubeGeometry, IcosahedronGeometry,
 QuadraticBezierCurve3, CatmullRomCurve3, Shape, Path, ShapeGeometry, ExtrudeGeometry, BufferGeometry, Float32BufferAttribute,
 CanvasTexture, RepeatWrapping, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter, HalfFloatType, PMREMGenerator,
 AmbientLight, HemisphereLight, DirectionalLight, PointLight, SpotLight,
 PCFSoftShadowMap, DoubleSide, FrontSide, BackSide, Fog, FogExp2, AdditiveBlending, NormalBlending, ACESFilmicToneMapping, NoToneMapping
} from 'three';
export { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
export { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
export { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
export { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
export { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
export { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
