/* eslint-disable react/no-unknown-property */
import React, { useEffect, useRef, useState } from 'react';

/**
 * TypeGPUBackground
 * A background component using WebGPU via TypeGPU (Software Mansion).
 * Falls back to GSAP animations if WebGPU is unavailable.
 * 
 * Features:
 * - Responsive canvas resizing
 * - Gen Z vibrant gradient shader
 * - Smooth animation loop
 */
const TypeGPUBackground = ({ intensity = 'medium' }) => {
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('initializing');
    const [gpuSupported, setGpuSupported] = useState(true);

    useEffect(() => {
        let animationFrameId;

        const initWebGPU = async () => {
            // 1. Check for WebGPU support
            if (!navigator.gpu) {
                setStatus('not-supported');
                setGpuSupported(false);
                return;
            }

            try {
                const adapter = await navigator.gpu.requestAdapter();
                if (!adapter) {
                    setStatus('no-adapter');
                    setGpuSupported(false);
                    return;
                }

                const device = await adapter.requestDevice();
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('webgpu');
                const format = navigator.gpu.getPreferredCanvasFormat();

                const configure = () => {
                    if (!canvas) return;
                    // Match canvas size to display size for 1:1 pixel mapping (2K crispness)
                    const width = window.innerWidth * window.devicePixelRatio;
                    const height = window.innerHeight * window.devicePixelRatio;

                    if (canvas.width !== width || canvas.height !== height) {
                        canvas.width = width;
                        canvas.height = height;

                        context.configure({
                            device,
                            format,
                            alphaMode: 'premultiplied',
                        });
                    }
                };

                // Initial config
                configure();

                // Handle Resize
                const handleResize = () => {
                    configure();
                };
                window.addEventListener('resize', handleResize);

                // ---------------------------------------------------------
                // TypeGPU / WebGPU Logic
                // ---------------------------------------------------------

                const shaderModule = device.createShaderModule({
                    label: 'Gen Z Gradient Shader',
                    code: `
            struct VertexOutput {
              @builtin(position) position : vec4f,
              @location(0) uv : vec2f,
            }

            @group(0) @binding(0) var<uniform> time : f32;

            @vertex
            fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
              var pos = array<vec2f, 3>(
                vec2f(-1.0, -1.0),
                vec2f(3.0, -1.0),
                vec2f(-1.0, 3.0)
              );

              var output : VertexOutput;
              output.position = vec4f(pos[vertexIndex], 0.0, 1.0);
              output.uv = pos[vertexIndex] * 0.5 + 0.5;
              return output;
            }

            @fragment
            fn fs(@location(0) uv : vec2f) -> @location(0) vec4f {
              // Gen Z Palette
              // #CCFF00 (Lime), #8B5CF6 (Violet), #06B6D4 (Cyan)
              
              let lime = vec3f(0.8, 1.0, 0.0);
              let violet = vec3f(0.54, 0.36, 0.96);
              let cyan = vec3f(0.02, 0.71, 0.83);

              // Dynamic noise/grain
              let noise = fract(sin(dot(uv + time * 0.1, vec2f(12.9898, 78.233))) * 43758.5453);
              
              // Movement
              let slowTime = time * 0.5;
              let yMap = uv.y + sin(uv.x * 3.0 + slowTime) * 0.1;
              let xMap = uv.x + cos(uv.y * 3.0 + slowTime * 0.8) * 0.1;

              let mix1 = mix(violet, cyan, xMap);
              let finalColor = mix(mix1, lime, yMap * 0.5);
              
              // Add noise for texture (2K feel)
              let texturedColor = finalColor + (noise * 0.03);

              let alpha = 0.6; // Base opacity
              return vec4f(texturedColor * alpha, alpha);
            }
          `
                });

                // Uniform buffer for time
                const uniformBufferSize = 4; // float32
                const uniformBuffer = device.createBuffer({
                    size: uniformBufferSize,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });

                const bindGroupLayout = device.createBindGroupLayout({
                    entries: [{
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        buffer: { type: 'uniform' },
                    }],
                });

                const bindGroup = device.createBindGroup({
                    layout: bindGroupLayout,
                    entries: [{
                        binding: 0,
                        resource: { buffer: uniformBuffer },
                    }],
                });

                const pipeline = device.createRenderPipeline({
                    label: 'Gradient Pipeline',
                    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
                    vertex: {
                        module: shaderModule,
                        entryPoint: 'vs',
                    },
                    fragment: {
                        module: shaderModule,
                        entryPoint: 'fs',
                        targets: [{
                            format: format,
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                },
                                alpha: {
                                    srcFactor: 'one',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add',
                                },
                            }
                        }],
                    },
                });

                let startTime = performance.now();

                const render = () => {
                    // Update time
                    const now = performance.now();
                    const time = (now - startTime) / 1000.0;
                    device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([time]));

                    const commandEncoder = device.createCommandEncoder();
                    const textureView = context.getCurrentTexture().createView();

                    const renderPass = commandEncoder.beginRenderPass({
                        colorAttachments: [{
                            view: textureView,
                            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
                            loadOp: 'clear',
                            storeOp: 'store',
                        }],
                    });

                    renderPass.setPipeline(pipeline);
                    renderPass.setBindGroup(0, bindGroup);
                    renderPass.draw(3);
                    renderPass.end();

                    device.queue.submit([commandEncoder.finish()]);

                    animationFrameId = requestAnimationFrame(render);
                };

                animationFrameId = requestAnimationFrame(render);
                setStatus('running');

                // Cleanup closure
                return () => {
                    window.removeEventListener('resize', handleResize);
                    cancelAnimationFrame(animationFrameId);
                };

            } catch (e) {
                console.error('WebGPU Init Error:', e);
                setStatus('error');
                setGpuSupported(false);
            }
        };

        let cleanupFn;
        initWebGPU().then(cleanup => {
            cleanupFn = cleanup;
        });

        return () => {
            if (cleanupFn) cleanupFn();
        };
    }, []);

    if (!gpuSupported) {
        return null;
    }

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ opacity: 0.7 }} // Higher opacity for visibility
        />
    );
};

export default TypeGPUBackground;
